const express = require('express');
const router = express.Router();
const {
  getAllJobHistory,
  getJobById,
  getJobStats,
  triggerJob,
  cancelJob,
  cleanupJobHistory,
  getApiStats,
  resetApiStats
} = require('../../controllers/admin/adminJobHistoryController');

// Job History routes (order matters - specific routes before parameterized ones)
router.get('/stats', getJobStats);
router.get('/api-stats', getApiStats);
router.get('/', getAllJobHistory);
router.post('/api-stats/reset', resetApiStats);
router.post('/trigger', triggerJob);
router.delete('/cleanup', cleanupJobHistory);
router.get('/:id', getJobById); // Keep :id route after specific routes
router.put('/:id/cancel', cancelJob);

module.exports = router; 