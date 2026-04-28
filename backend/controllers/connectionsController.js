const connectionsService = require('../services/connectionsService');
const { ApiError } = require('../utils/errors');

exports.createConnection = async (req, res, next) => {
  try {
    const { appId, type, name, credentials, metadata } = req.body;
    
    if (!appId || !type || !credentials) {
      throw new ApiError(400, 'Missing required fields: appId, type, credentials');
    }

    const connection = await connectionsService.createConnection({
      appId,
      type,
      name: name || `${type}_${Date.now()}`,
      credentials,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

exports.getConnectionsByApp = async (req, res, next) => {
  try {
    const { appId } = req.params;
    const connections = await connectionsService.getConnectionsByApp(appId);
    
    res.status(200).json({
      success: true,
      data: connections,
    });
  } catch (error) {
    next(error);
  }
};

exports.getConnection = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const connection = await connectionsService.getConnection(connectionId);
    
    if (!connection) {
      throw new ApiError(404, 'Connection not found');
    }

    res.status(200).json({
      success: true,
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

exports.updateConnection = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const updateData = req.body;

    const connection = await connectionsService.updateConnection(connectionId, updateData);
    
    if (!connection) {
      throw new ApiError(404, 'Connection not found');
    }

    res.status(200).json({
      success: true,
      data: connection,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteConnection = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const result = await connectionsService.deleteConnection(connectionId);
    
    if (!result) {
      throw new ApiError(404, 'Connection not found');
    }

    res.status(200).json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

exports.testConnection = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const result = await connectionsService.testConnection(connectionId);
    
    res.status(200).json({
      success: result.success,
      data: {
        status: result.success ? 'connected' : 'failed',
        message: result.message,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getConnectionStatus = async (req, res, next) => {
  try {
    const { connectionId } = req.params;
    const status = await connectionsService.getConnectionStatus(connectionId);
    
    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};
