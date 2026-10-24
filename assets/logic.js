/* logic.js - validation and calculation rules (no DOM, so it can be unit tested) */
(function (root) {
  'use strict';

  var SERVICES = ['House cleaning', 'Office cleaning', 'Deep cleaning', 'Carpet cleaning', 'Window cleaning', 'Laundry and ironing'];
  var STATUSES = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  var MAX_CHARGE = 100000000;

  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var p = s.split('-').map(Number);
    var d = new Date(p[0], p[1] - 1, p[2]);
    return d.getFullYear() === p[0] && d.getMonth() === p[1] - 1 && d.getDate() === p[2] && p[0] >= 2000 && p[0] <= 2100;
  }

  /* Returns an object of field -> error message. Empty object means valid. */
  function validateBooking(b) {
    var errors = {};
    var name = String(b.client == null ? '' : b.client).trim();
    var phone = String(b.phone == null ? '' : b.phone).trim().replace(/[\s-]/g, '');
    var chargeText = String(b.charge == null ? '' : b.charge).trim();

    if (!name) errors.client = 'Client name is required.';
    else if (name.length < 2) errors.client = 'Client name must have at least 2 characters.';
    else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(name)) errors.client = 'Client name may contain letters only.';

    if (!phone) errors.phone = 'Phone number is required.';
    else if (!/^(0\d{9}|\+256\d{9})$/.test(phone)) errors.phone = 'Use a valid number such as 0772000000 or +256772000000.';

    if (!b.service || SERVICES.indexOf(b.service) === -1) errors.service = 'Choose a service.';

    if (!b.date) errors.date = 'Service date is required.';
    else if (!isValidDate(b.date)) errors.date = 'Enter a valid date.';

    if (!chargeText) errors.charge = 'Charge is required.';
    else if (!/^\d+(\.\d+)?$/.test(chargeText)) errors.charge = 'Charge must be a number (no letters or negative values).';
    else if (Number(chargeText) <= 0) errors.charge = 'Charge must be greater than 0.';
    else if (Number(chargeText) > MAX_CHARGE) errors.charge = 'Charge is too large.';

    if (STATUSES.indexOf(b.status) === -1) errors.status = 'Choose a booking status.';

    return errors;
  }

  /* Expected earnings = charges of Pending + Confirmed bookings (work still to be done).
     Completed bookings are earned; Cancelled bookings are excluded. */
  function calcSummary(list) {
    var s = { total: list.length, Pending: 0, Confirmed: 0, Completed: 0, Cancelled: 0,
              expected: 0, earned: 0, potential: 0 };
    list.forEach(function (b) {
      var c = Number(b.charge) || 0;
      if (s[b.status] !== undefined) s[b.status] += 1;
      if (b.status === 'Pending' || b.status === 'Confirmed') s.expected += c;
      if (b.status === 'Completed') s.earned += c;
    });
    s.potential = s.expected + s.earned;
    return s;
  }

  function formatUGX(n) {
    return 'UGX ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function filterBookings(list, status, query) {
    var q = String(query || '').trim().toLowerCase();
    return list.filter(function (b) {
      if (status && status !== 'All' && b.status !== status) return false;
      if (q && (b.client + ' ' + b.service).toLowerCase().indexOf(q) === -1) return false;
      return true;
    }).sort(function (a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
  }

  var api = { SERVICES: SERVICES, STATUSES: STATUSES, validateBooking: validateBooking,
              calcSummary: calcSummary, formatUGX: formatUGX, filterBookings: filterBookings, isValidDate: isValidDate };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : this);
