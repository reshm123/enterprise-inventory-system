import dashboardService from '../services/dashboard.service.js';
import {successResponse, } from '../utils/response.js';

const getDashboardSummary = async (req, res, next) => {
    try{
        console.log("Fetching dashboard summary...", req.user);
        const dashboardData = await dashboardService(req.user);
        return successResponse(res, 200, "Dashboard summary fetched successfully", dashboardData);
    } catch (error) {
        next(error);
    }
};

export { getDashboardSummary };