import dashboardService from '../services/dashboard.service.js';
import {successResponse, } from '../utils/response.js';

const getDashboardSummary = async (req, res, next) => {
    try{
const dashboardData = await dashboardService();
return successResponse(res, 200, "Dashboard summary fetched successfully", dashboardData);
    }catch(error){
next(error);
    }

}
export { getDashboardSummary };