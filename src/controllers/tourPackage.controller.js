const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const createTourPackage = async (req, res) => {
  try {
    const {
      title,
      subtitle,
      duration,
      maxGroupSize,
      pricePerPerson,
      tourType,
      description,
      highlights,
      includedItems,
      excludedItems,
      coverImage,
      galleryImages,
      phoneNumber,
      email,
      whatsapp,
      cancellationPolicy,
      additionalInfo,
      itinerary,
    } = req.body;

    // Get agency ID from the authenticated user
    const agency = await prisma.agency.findUnique({
      where: { userId: req.user.id },
    });

    if (!agency) {
      return res.status(404).json({ message: 'Agency not found' });
    }

    // Create tour package with itinerary in a transaction
    const result = await prisma.$transaction(async (prisma) => {
      // Create tour package
      const tourPackage = await prisma.tourPackage.create({
        data: {
          title,
          subtitle,
          duration,
          maxGroupSize,
          pricePerPerson,
          tourType,
          description,
          highlights,
          includedItems,
          excludedItems,
          coverImage,
          galleryImages,
          phoneNumber,
          email,
          whatsapp,
          cancellationPolicy,
          additionalInfo,
          agencyId: agency.id,
        },
      });

      // Create itinerary items
      if (itinerary && itinerary.length > 0) {
        await prisma.itinerary.createMany({
          data: itinerary.map((day) => ({
            ...day,
            tourPackageId: tourPackage.id,
          })),
        });
      }

      return tourPackage;
    });

    res.status(201).json({
      message: 'Tour package created successfully',
      tourPackage: result,
    });
  } catch (error) {
    console.error('Create tour package error:', error);
    res.status(500).json({ message: 'Error creating tour package' });
  }
};

const getAllTourPackages = async (req, res) => {
  try {
    const tourPackages = await prisma.tourPackage.findMany({
      include: {
        agency: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        itinerary: true,
      },
    });

    res.json(tourPackages);
  } catch (error) {
    console.error('Get tour packages error:', error);
    res.status(500).json({ message: 'Error fetching tour packages' });
  }
};

const getTourPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const tourPackage = await prisma.tourPackage.findUnique({
      where: { id },
      include: {
        agency: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        itinerary: true,
      },
    });

    if (!tourPackage) {
      return res.status(404).json({ message: 'Tour package not found' });
    }

    res.json(tourPackage);
  } catch (error) {
    console.error('Get tour package error:', error);
    res.status(500).json({ message: 'Error fetching tour package' });
  }
};

const updateTourPackage = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findUnique({
      where: { id },
      include: { agency: true },
    });

    if (!existingPackage) {
      return res.status(404).json({ message: 'Tour package not found' });
    }

    if (
      req.user.role === 'AGENCY' &&
      existingPackage.agency.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized to update this tour package',
      });
    }

    // Update tour package
    const updatedPackage = await prisma.tourPackage.update({
      where: { id },
      data: updateData,
      include: {
        agency: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        itinerary: true,
      },
    });

    res.json({
      message: 'Tour package updated successfully',
      tourPackage: updatedPackage,
    });
  } catch (error) {
    console.error('Update tour package error:', error);
    res.status(500).json({ message: 'Error updating tour package' });
  }
};

const deleteTourPackage = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tour package exists and belongs to the agency
    const existingPackage = await prisma.tourPackage.findUnique({
      where: { id },
      include: { agency: true },
    });

    if (!existingPackage) {
      return res.status(404).json({ message: 'Tour package not found' });
    }

    if (
      req.user.role === 'AGENCY' &&
      existingPackage.agency.userId !== req.user.id
    ) {
      return res.status(403).json({
        message: 'Not authorized to delete this tour package',
      });
    }

    // Delete tour package (cascade will handle itinerary)
    await prisma.tourPackage.delete({
      where: { id },
    });

    res.json({ message: 'Tour package deleted successfully' });
  } catch (error) {
    console.error('Delete tour package error:', error);
    res.status(500).json({ message: 'Error deleting tour package' });
  }
};

module.exports = {
  createTourPackage,
  getAllTourPackages,
  getTourPackageById,
  updateTourPackage,
  deleteTourPackage,
}; 