# 🎯 Manual Job Triggers Guide

## 📋 Overview

Since you're on Vercel's hobby plan, automatic cron jobs are not available. Instead, you can manually trigger jobs from your admin panel using these endpoints.

---

## 🚀 Manual Trigger Endpoints

### **1. Trigger NFL Schedule Job:**
```http
POST /api/admin/cron/trigger/schedule
Authorization: Bearer <admin-token>
```

### **2. Trigger NFL News Job:**
```http
POST /api/admin/cron/trigger/news
Authorization: Bearer <admin-token>
```

### **3. Check Job Status:**
```http
GET /api/admin/cron/status
Authorization: Bearer <admin-token>
```

---

## 💻 Admin Panel Implementation Example

### **JavaScript/React Example:**
```javascript
// Admin Panel - Manual Job Triggers

const triggerScheduleJob = async () => {
  try {
    const response = await fetch('/api/admin/cron/trigger/schedule', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Schedule job triggered:', result.message);
      // Update UI with success message
    } else {
      console.error('❌ Job failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

const triggerNewsJob = async () => {
  try {
    const response = await fetch('/api/admin/cron/trigger/news', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ News job triggered:', result.message);
      // Update UI with success message
    } else {
      console.error('❌ Job failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Network error:', error);
  }
};

const checkJobStatus = async () => {
  try {
    const response = await fetch('/api/admin/cron/status', {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    const result = await response.json();
    console.log('📊 Job Status:', result.data);
    // Update UI with job status
  } catch (error) {
    console.error('❌ Status check failed:', error);
  }
};
```

---

## 🎨 Suggested Admin Panel UI

### **Add these buttons to your admin dashboard:**

```html
<!-- Manual Job Controls -->
<div class="job-controls">
  <h3>🔄 Manual Job Triggers</h3>
  
  <div class="job-buttons">
    <button onclick="triggerScheduleJob()" class="btn btn-primary">
      📅 Fetch NFL Schedule
    </button>
    
    <button onclick="triggerNewsJob()" class="btn btn-primary">
      📰 Fetch NFL News
    </button>
    
    <button onclick="checkJobStatus()" class="btn btn-secondary">
      📊 Check Job Status
    </button>
  </div>
  
  <div id="job-results" class="results-panel">
    <!-- Job results will be displayed here -->
  </div>
</div>
```

---

## 📅 Recommended Schedule

Since automatic jobs are disabled, manually trigger these jobs:

### **Daily:**
- **Morning** (9 AM): Trigger news job for latest updates
- **Evening** (6 PM): Trigger schedule job for match updates

### **Game Days:**
- **2 hours before games**: Trigger both jobs
- **After games**: Trigger schedule job for final scores

---

## 🔧 Job Response Examples

### **Success Response:**
```json
{
  "success": true,
  "message": "NFL Schedule Fetch triggered successfully",
  "jobName": "NFL Schedule Fetch",
  "result": {
    "processed": 15,
    "updated": 3,
    "created": 2
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "triggeredBy": "manual"
}
```

### **Error Response:**
```json
{
  "success": false,
  "error": "Failed to trigger cron job",
  "message": "Database connection timeout"
}
```

---

## 💡 Pro Tips

1. **Monitor Job Status**: Always check job status after triggering
2. **Error Handling**: Implement proper error handling in your admin panel
3. **Loading States**: Show loading spinners while jobs are running
4. **Notifications**: Add toast notifications for job completion
5. **Logging**: Keep a log of manually triggered jobs in your admin panel

---

## 🎯 Benefits of Manual Triggers

✅ **Full Control** - Trigger jobs when needed  
✅ **Cost Effective** - No Vercel Pro plan required  
✅ **Debugging** - Easier to debug when jobs run  
✅ **Flexibility** - Run jobs based on real events (before games, etc.)  
✅ **Resource Saving** - Jobs only run when necessary  

Your manual job system is now ready! 🚀 