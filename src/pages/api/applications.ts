import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

interface Application {
  id: string;
  name: string;
  status?: string;
  createdAt?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Connect to MongoDB via existing mongoose connection
    const ApplicationCollection = mongoose.connection.collection('applicationmasters');
    
    // Fetch all applications sorted by creation date
    const applications = await ApplicationCollection
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    // Transform to expected format
    const transformedApps: Application[] = applications.map((app: any) => ({
      id: app.id || app._id?.toString(),
      name: app.name || 'Unnamed Application',
      status: app.status,
      createdAt: app.createdAt?.toISOString(),
    }));

    return res.status(200).json({
      success: true,
      data: transformedApps,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('[API] Error fetching applications:', errorMessage);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: errorMessage,
    });
  }
}
