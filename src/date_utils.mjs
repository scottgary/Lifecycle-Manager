/**
 * @param {Date} date
 * @return {string}
 */
export function formatDate_YYYYMMDD(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split("T")[0];
}

export function getCurrentEpoch(){
  return new Date(date.getTime());
}

/**
 * @param {timezone} string
 * @param {action} string
 * @param {ts} number
 */
export function getTimezoneAdjustment(ts, timezone, action){
  try {
    if (action == 'onboarding') {
      var timeOfDay = '0800'
    }
    else {
      var timeOfDay = '1700'
    }

    switch (timezone) {
      case 'EST':
        console.log('Setup time in EST')
        break;
      case 'PST':
        console.log('Setup time in PST')
        break;
    }

  }
  catch(e) {
    console.log('ERROR: ', e)
    
  }
}

/**
 *  Number of days between the provided unix timestamp and now
 *
 * @param {number }start
 * @returns {number}
 */
export function nbDays(start) {
  const end = new Date().getTime();
  let delta = Math.abs(end - start) / 1000;
  return Math.floor(delta / 86400);
}

export async function getCurrentDate() {
  return new Date().toISOString();
}

export function getEpochFromDate(date) {
  return new Date(date).getTime();
}
