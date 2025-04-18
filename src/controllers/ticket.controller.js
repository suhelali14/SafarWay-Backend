const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ApiError = require('../utils/ApiError');
const { TicketStatus, UserRole } = require('@prisma/client');

// Create a new ticket
const createTicket = async (req, res) => {
  try {
    const { title, description, priority } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get user's agency if they are an agency user
    let agencyId = null;
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      agencyId = user.agencyId;
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        title,
        description,
        priority,
        raisedById: userId,
        agencyId,
        status: TicketStatus.OPEN
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Create initial log entry
    await prisma.ticketAssignmentLog.create({
      data: {
        ticketId: ticket.id,
        userId,
        previousStatus: TicketStatus.OPEN,
        newStatus: TicketStatus.OPEN,
        comment: 'Ticket created'
      }
    });

    res.status(201).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

// Get tickets based on user role
const getTickets = async (req, res) => {
  try {
    const { limit = 10, offset = 0, status, priority } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let where = {};
    
    // Filter by status and priority if provided
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Agency users can only see their agency's tickets
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      where.agencyId = user.agencyId;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        agency: {
          select: {
            id: true,
            name: true
          }
        }
      },
      skip: parseInt(offset),
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      }
    });

    const total = await prisma.supportTicket.count({ where });

    res.json({
      success: true,
      data: tickets,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    throw new ApiError(500, error.message);
  }
};

// Get a single ticket by ID
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        agency: {
          select: {
            id: true,
            name: true
          }
        },
        logs: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Check if user has permission to view this ticket
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      if (ticket.agencyId !== user.agencyId) {
        throw new ApiError(403, 'You do not have permission to view this ticket');
      }
    }

    res.json({
      success: true,
      data: ticket
    });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message);
  }
};

// Assign a ticket
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedToId, comment } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        agency: true
      }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Check permissions
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      if (ticket.agencyId !== user.agencyId) {
        throw new ApiError(403, 'You do not have permission to assign this ticket');
      }
    }

    // Verify assigned user exists and belongs to the same agency if applicable
    if (assignedToId) {
      const assignedUser = await prisma.user.findUnique({
        where: { id: assignedToId }
      });
      if (!assignedUser) {
        throw new ApiError(404, 'Assigned user not found');
      }
      if (ticket.agencyId && assignedUser.agencyId !== ticket.agencyId) {
        throw new ApiError(400, 'Cannot assign ticket to user from different agency');
      }
    }

    const previousStatus = ticket.status;
    const newStatus = TicketStatus.ASSIGNED;

    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId,
        status: newStatus
      },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create log entry
    await prisma.ticketAssignmentLog.create({
      data: {
        ticketId: id,
        userId,
        previousStatus,
        newStatus,
        comment: comment || 'Ticket assigned'
      }
    });

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message);
  }
};

// Update ticket status
const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        agency: true
      }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Validate status transition
    const validTransitions = {
      [TicketStatus.OPEN]: [TicketStatus.ASSIGNED],
      [TicketStatus.ASSIGNED]: [TicketStatus.IN_PROGRESS],
      [TicketStatus.IN_PROGRESS]: [TicketStatus.RESOLVED],
      [TicketStatus.RESOLVED]: [TicketStatus.CLOSED]
    };

    if (!validTransitions[ticket.status].includes(status)) {
      throw new ApiError(400, 'Invalid status transition');
    }

    // Check permissions
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      if (ticket.agencyId !== user.agencyId) {
        throw new ApiError(403, 'You do not have permission to update this ticket');
      }
    }

    // Additional permission checks for specific status transitions
    if (status === TicketStatus.IN_PROGRESS || status === TicketStatus.RESOLVED) {
      if (ticket.assignedToId !== userId && userRole !== UserRole.SAFARWAY_ADMIN) {
        throw new ApiError(403, 'Only the assigned user or admin can update ticket to this status');
      }
    }

    if (status === TicketStatus.CLOSED) {
      if (ticket.raisedById !== userId && userRole !== UserRole.SAFARWAY_ADMIN) {
        throw new ApiError(403, 'Only the ticket creator or admin can close the ticket');
      }
    }

    const previousStatus = ticket.status;
    const updatedTicket = await prisma.supportTicket.update({
      where: { id },
      data: { status },
      include: {
        raisedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Create log entry
    await prisma.ticketAssignmentLog.create({
      data: {
        ticketId: id,
        userId,
        previousStatus,
        newStatus: status,
        comment: comment || `Status updated to ${status}`
      }
    });

    res.json({
      success: true,
      data: updatedTicket
    });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message);
  }
};

// Get ticket logs
const getTicketLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      select: { agencyId: true }
    });

    if (!ticket) {
      throw new ApiError(404, 'Ticket not found');
    }

    // Check permissions
    if (userRole === UserRole.AGENCY_USER || userRole === UserRole.AGENCY_ADMIN) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { agencyId: true }
      });
      if (ticket.agencyId !== user.agencyId) {
        throw new ApiError(403, 'You do not have permission to view these logs');
      }
    }

    const logs = await prisma.ticketAssignmentLog.findMany({
      where: { ticketId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    throw new ApiError(error.statusCode || 500, error.message);
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  assignTicket,
  updateTicketStatus,
  getTicketLogs
}; 