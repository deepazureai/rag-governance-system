const Application = require('../models/Application');
const { ApiError } = require('../utils/errors');

class ApplicationsService {
  async createApplication(data) {
    const application = new Application(data);
    return await application.save();
  }

  async getApplications() {
    return await Application.find({ status: { $ne: 'archived' } });
  }

  async getApplication(appId) {
    return await Application.findById(appId);
  }

  async updateApplication(appId, updateData) {
    const application = await Application.findByIdAndUpdate(
      appId,
      updateData,
      { new: true }
    );
    return application;
  }

  async deleteApplication(appId) {
    const result = await Application.findByIdAndDelete(appId);
    return !!result;
  }
}

module.exports = new ApplicationsService();
