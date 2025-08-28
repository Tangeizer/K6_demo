import exec from 'k6/execution';

export function logTestStart(testName) {
  console.log(`🚀 Starting ${testName} - VU ${exec.vu.idInTest} Iteration ${exec.vu.iterationInInstance}`);
}

export function logTestEnd(testName, success) {
  const status = success ? '✅' : '❌';
  console.log(`${status} Finished ${testName} - VU ${exec.vu.idInTest}`);
}

export function validateJsonResponse(response, context) {
  if (!response) {
    console.log(`${context}: No response received`);
    return null;
  }

  if (response.status !== 200) {
    console.log(`${context}: Status ${response.status}`);
    return null;
  }

  try {
    return JSON.parse(response.body);
  } catch (error) {
    console.log(`${context}: Invalid JSON - ${response.body.substring(0, 100)}...`);
    return null;
  }
}