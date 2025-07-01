const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAutoReportGeneration() {
  console.log('🧪 Testing Auto Report Generation Implementation');
  console.log('=' .repeat(60));

  try {
    // Step 1: Create a project with auto-report generation enabled
    console.log('\n1️⃣ Creating project with auto-report generation...');
    
    const projectData = {
      name: 'Auto Report Test Project',
      description: 'Testing automatic report generation functionality',
      autoAssignCompetitors: true,
      autoGenerateInitialReport: true,
      frequency: 'weekly',
      reportTemplate: 'comprehensive',
      reportName: 'Weekly Competitive Analysis'
    };

    const createResponse = await axios.post(`${BASE_URL}/api/projects`, projectData);
    
    if (createResponse.status === 201) {
      console.log('✅ Project created successfully');
      console.log(`   Project ID: ${createResponse.data.id}`);
      console.log(`   Project Name: ${createResponse.data.name}`);
      console.log(`   Competitors: ${createResponse.data.competitors.length}`);
      
      if (createResponse.data.reportGeneration) {
        console.log('📊 Report Generation Info:');
        console.log(`   Initial Report Queued: ${createResponse.data.reportGeneration.initialReportQueued}`);
        console.log(`   Task ID: ${createResponse.data.reportGeneration.taskId}`);
        console.log(`   Queue Position: ${createResponse.data.reportGeneration.queuePosition}`);
        console.log(`   Periodic Reports: ${createResponse.data.reportGeneration.periodicReportsScheduled}`);
        console.log(`   Frequency: ${createResponse.data.reportGeneration.frequency}`);
      }
    } else {
      console.log('❌ Failed to create project');
      return;
    }

    const projectId = createResponse.data.id;

    // Step 2: Check generation status
    console.log('\n2️⃣ Checking report generation status...');
    
    const statusResponse = await axios.get(`${BASE_URL}/api/reports/generation-status/${projectId}`);
    
    if (statusResponse.status === 200) {
      console.log('✅ Status retrieved successfully');
      console.log(`   Is Generating: ${statusResponse.data.generationStatus.isGenerating}`);
      console.log(`   Queue Position: ${statusResponse.data.generationStatus.queuePosition}`);
      console.log(`   Recent Reports Count: ${statusResponse.data.recentReportsCount}`);
      
      if (statusResponse.data.schedule) {
        console.log('📅 Schedule Info:');
        console.log(`   Frequency: ${statusResponse.data.schedule.frequency}`);
        console.log(`   Next Run: ${statusResponse.data.schedule.nextRunTime}`);
        console.log(`   Active: ${statusResponse.data.schedule.isActive}`);
      }
    } else {
      console.log('❌ Failed to get generation status');
    }

    // Step 3: Test manual report generation
    console.log('\n3️⃣ Testing manual report generation...');
    
    const manualReportData = {
      projectId: projectId,
      immediate: true,
      template: 'executive',
      notify: true
    };

    const manualResponse = await axios.post(`${BASE_URL}/api/reports/auto-generate`, manualReportData);
    
    if (manualResponse.status === 200) {
      console.log('✅ Manual report generation triggered');
      console.log(`   Task ID: ${manualResponse.data.taskId}`);
      console.log(`   Queue Position: ${manualResponse.data.queuePosition}`);
      console.log(`   Estimated Completion: ${manualResponse.data.estimatedCompletion}`);
    } else {
      console.log('❌ Failed to trigger manual report generation');
    }

    // Step 4: Test schedule management
    console.log('\n4️⃣ Testing schedule management...');
    
    const scheduleData = {
      projectId: projectId,
      frequency: 'daily',
      template: 'technical'
    };

    const scheduleResponse = await axios.post(`${BASE_URL}/api/reports/schedule`, scheduleData);
    
    if (scheduleResponse.status === 201) {
      console.log('✅ Schedule created successfully');
      console.log(`   Schedule ID: ${scheduleResponse.data.schedule.id}`);
      console.log(`   Frequency: ${scheduleResponse.data.schedule.frequency}`);
      console.log(`   Next Run: ${scheduleResponse.data.schedule.nextRunTime}`);
    } else {
      console.log('❌ Failed to create schedule');
    }

    // Step 5: Get schedule info
    console.log('\n5️⃣ Retrieving schedule information...');
    
    const getScheduleResponse = await axios.get(`${BASE_URL}/api/reports/schedule?projectId=${projectId}`);
    
    if (getScheduleResponse.status === 200) {
      console.log('✅ Schedule info retrieved');
      if (getScheduleResponse.data.schedule) {
        console.log(`   Frequency: ${getScheduleResponse.data.schedule.frequency}`);
        console.log(`   Template: ${getScheduleResponse.data.schedule.reportTemplate}`);
        console.log(`   Active: ${getScheduleResponse.data.schedule.isActive}`);
      } else {
        console.log('   No schedule found');
      }
    } else {
      console.log('❌ Failed to get schedule info');
    }

    // Step 6: Wait a bit and check status again
    console.log('\n6️⃣ Waiting 5 seconds and checking status again...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const finalStatusResponse = await axios.get(`${BASE_URL}/api/reports/generation-status/${projectId}`);
    
    if (finalStatusResponse.status === 200) {
      console.log('✅ Final status retrieved');
      console.log(`   Is Generating: ${finalStatusResponse.data.generationStatus.isGenerating}`);
      console.log(`   Queue Position: ${finalStatusResponse.data.generationStatus.queuePosition}`);
      console.log(`   Recent Reports Count: ${finalStatusResponse.data.recentReportsCount}`);
    }

    console.log('\n🎉 Auto Report Generation Test Completed Successfully!');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('=' .repeat(60));
  }
}

// Run the test
if (require.main === module) {
  testAutoReportGeneration();
}

module.exports = { testAutoReportGeneration }; 