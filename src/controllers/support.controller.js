const { PrismaClient } = require('@prisma/client');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');

const prisma = new PrismaClient();

// Create a new support ticket
const createTicket = async (req, res) => {
  try {
    const { subject, description, priority, category } = req.body;
    const userId = req.user?.id; // Optional: allow anonymous tickets

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        description,
        priority,
        category,
        status: 'OPEN',
        userId,
      },
    });

    res.status(201).json(
      ApiResponse.success(ticket, 'Support ticket created successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Error creating support ticket');
  }
};

// Get tickets based on user role
const getTickets = async (req, res) => {
  try {
    const { status, priority, category } = req.query;
    const where = {};

    // Filter conditions
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (category) where.category = category;

    // If customer, show only their tickets
    if (req.user.role === 'CUSTOMER') {
      where.userId = req.user.id;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json(ApiResponse.success(tickets));
  } catch (error) {
    throw new ApiError(500, 'Error fetching support tickets');
  }
};

// Get a single ticket by ID
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            name: true,
            email: true,
          },
        },
        responses: {
          include: {
            user: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      throw new ApiError(404, 'Support ticket not found');
    }

    // Check if user has access to this ticket
    if (
      req.user.role === 'CUSTOMER' &&
      ticket.userId !== req.user.id
    ) {
      throw new ApiError(403, 'You do not have permission to view this ticket');
    }

    res.json(ApiResponse.success(ticket));
  } catch (error) {
    throw new ApiError(500, 'Error fetching support ticket');
  }
};

// Update a ticket
const updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { priority, category, status } = req.body;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        priority,
        category,
        status,
      },
    });

    res.json(ApiResponse.success(ticket, 'Support ticket updated successfully'));
  } catch (error) {
    throw new ApiError(500, 'Error updating support ticket');
  }
};

// Add a response to a ticket
const addResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    const response = await prisma.ticketResponse.create({
      data: {
        message,
        ticketId: id,
        userId: req.user.id,
      },
      include: {
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    // Update ticket status if staff responds
    if (['SAFARWAY_ADMIN', 'SUPPORT_STAFF'].includes(req.user.role)) {
      await prisma.supportTicket.update({
        where: { id },
        data: { status: 'IN_PROGRESS' },
      });
    }

    res.status(201).json(
      ApiResponse.success(response, 'Response added successfully')
    );
  } catch (error) {
    throw new ApiError(500, 'Error adding response to ticket');
  }
};

// Assign a ticket to staff
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId } = req.body;

    // Create assignment log
    await prisma.ticketAssignmentLog.create({
      data: {
        ticketId: id,
        assignedById: req.user.id,
        assignedToId: staffId,
      },
    });

    // Update ticket
    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToId: staffId,
        status: 'ASSIGNED',
      },
    });

    res.json(ApiResponse.success(ticket, 'Ticket assigned successfully'));
  } catch (error) {
    throw new ApiError(500, 'Error assigning ticket');
  }
};

// Close a ticket
const closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data: {
        status: 'CLOSED',
        resolution,
        closedAt: new Date(),
        closedById: req.user.id,
      },
    });

    res.json(ApiResponse.success(ticket, 'Ticket closed successfully'));
  } catch (error) {
    throw new ApiError(500, 'Error closing ticket');
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  addResponse,
  assignTicket,
  closeTicket,
}; 