function getBerlinParts(date) {
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  });
  var parts = fmt.formatToParts(date);
  var wd = '';
  var hour = 0;
  var minute = 0;
  for (var i = 0; i < parts.length; i++) {
    if (parts[i].type === 'weekday') wd = parts[i].value;
    else if (parts[i].type === 'hour') hour = parseInt(parts[i].value, 10);
    else if (parts[i].type === 'minute') minute = parseInt(parts[i].value, 10);
  }
  var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: map[wd], hour: hour % 24, minute: minute };
}

function status(date) {
  var hours = { 1: [10, 19], 2: [9, 19], 3: [9, 19], 4: [9, 19], 5: [9, 19], 6: [9, 18], 0: null };
  var weekdayNames = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  var bp = getBerlinParts(date);
  var day = bp.day;
  var now = bp.hour * 60 + bp.minute;
  var pad = function(n) { return String(n).padStart(2, '0'); };

  if (hours[day]) {
    var opening = hours[day][0] * 60;
    var closing = hours[day][1] * 60;
    if (now >= opening && now < closing) {
      return 'Heute geöffnet bis ' + pad(hours[day][1]) + ':00';
    }
    if (now < opening) {
      return 'Heute ab ' + pad(hours[day][0]) + ':00';
    }
  }

  for (var i = 1; i <= 7; i++) {
    var nextDay = (day + i) % 7;
    if (hours[nextDay]) {
      var openTime = pad(hours[nextDay][0]) + ':00';
      if (i === 1) {
        return 'Morgen ab ' + openTime;
      }
      return weekdayNames[nextDay] + ' ab ' + openTime;
    }
  }
}

if (typeof document !== 'undefined') {
  var init = function() {
    var now = new Date();
    var el = document.getElementById('status');
    if (el) {
      el.textContent = status(now);
    }
    var bp = getBerlinParts(now);
    var todayStr = String(bp.day);
    var rows = document.querySelectorAll('.hours [data-days]');
    for (var i = 0; i < rows.length; i++) {
      var days = rows[i].getAttribute('data-days').split(' ');
      if (days.indexOf(todayStr) !== -1) {
        rows[i].classList.add('heute');
      }
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

if (typeof module !== 'undefined') {
  module.exports = { status: status };
}
