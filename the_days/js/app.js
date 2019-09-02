Date.prototype.isLeapYear = function() {
    var year = this.getFullYear();
    if((year & 3) != 0) return false;
    return ((year % 100) != 0 || (year % 400) == 0);
};

// Get Day of Year
Date.prototype.getDOY = function() {
    var dayCount = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    var mn = this.getMonth();
    var dn = this.getDate();
    var dayOfYear = dayCount[mn] + dn;
    if(mn > 1 && this.isLeapYear()) dayOfYear++;
    return dayOfYear;
};

function formatDuration( seconds ) {
	var hours = parseInt( seconds / 3600, 10 ).toString().padStart(2, '0');
	var minutes = parseInt( ( seconds % 3600 ) / 60, 10 ).toString().padStart(2, '0');
	seconds = (seconds - (hours * 3600) - minutes * 60).toString().padStart(2, '0');

	str = hours + ":" + minutes + ":" + seconds;
	return str;
}



const HOLIDAYS = [
	'5/30/2019',
	'6/10/2019',
	'6/20/2019',	
	'8/15/2019',	
	
	'5/31/2019',
	'6/1/2019',
	'6/2/2019',
	'6/3/2019',	
	'6/4/2019',	
	'6/5/2019',		
	'6/6/2019',		
	'6/7/2019',		
	'6/8/2019',		
	'6/9/2019',		
	'6/10/2019',						
	'6/11/2019',		
	'6/12/2019',		
	'6/13/2019',	
	'6/14/2019',	
	'6/15/2019',					
	'6/16/2019',		
	'6/17/2019',						
	'6/18/2019',						
	'6/19/2019',						
	'6/20/2019',										
	'6/21/2019',											
];

const DAY_END_SECONDS = 18 * 60 * 60;
const DAY_LENGTH_SECONDS = 10 * 60 * 60;	
const FINAL_DATE = new Date('2019-08-31T17:00:00');
const FINAL_DATE_DAY_INDEX = FINAL_DATE.getDOY();

var leftDaysNode, leftHoursNode, pageTitleNode;
var daysLeft;
var todayDayIndex;
var hoursLeftOld;

// Calculate durations
todayDayIndex = new Date().getDOY();
daysLeft = getDaysLeft(todayDayIndex, FINAL_DATE_DAY_INDEX);

// Init nodes
leftDaysNode = document.getElementById('js-days-left');
leftHoursNode = document.getElementById('js-hours-left');	
pageTitleNode = document.getElementsByTagName('title')[0];

function initialize() {
	var now = new Date();
	var hoursLeft;	
	hoursLeft = getHoursLeft(now, daysLeft.length);
	
	if( hoursLeft !== hoursLeftOld) {
		render(daysLeft.length, formatDuration( hoursLeft ));
	}
	hoursLeftOld = hoursLeft;
	window.requestAnimationFrame(initialize);
}


function getDaysLeft(startDayIndex, endDayIndex) {
	var dateString,
		currentDate,
		res = [];

	for( i = startDayIndex; i <= endDayIndex; i++ ) {
		currentDate = new Date(2019, 0, i);
		dateString = currentDate.toLocaleDateString("en-US");
	
		if( currentDate.getDay() === 0 || currentDate.getDay() === 6 ) {
			continue;
		}
	
		if( HOLIDAYS.includes( dateString ) === true) {
			continue;
		}
	
		res.push(currentDate);
	}
	
	return res;
}


function getHoursLeft(now, daysLeft) {
	var secondsLeftToday = 0;
	var currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

		
	if( currentSeconds >= DAY_END_SECONDS ) {
		secondsLeftToday = 0;
	} else {
		secondsLeftToday = DAY_END_SECONDS - currentSeconds;
		
		// No more than 8 hours
		secondsLeftToday = (secondsLeftToday >= DAY_LENGTH_SECONDS) ? DAY_LENGTH_SECONDS : secondsLeftToday;
	}

	if( daysLeft >= 1) {
		 return ( (daysLeft - 1) * 8 * 3600 + secondsLeftToday);
	} else {
		return secondsLeftToday;
	}
}

function render(daysLeft, hoursLeft) {
	leftDaysNode.textContent = daysLeft;
	leftHoursNode.textContent = hoursLeft + " Stunden";
	pageTitleNode.textContent = hoursLeft;
}

window.requestAnimationFrame(initialize);