/* app.js - screens, navigation, local storage and record management */
(function () {
  'use strict';
  var L = window.Logic;
  var KEY = 'cleaningBookings.v1';
  var $ = function (id) { return document.getElementById(id); };
  var bookings = load();

  /* ---------- local storage ---------- */
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(d) ? d : []; }
    catch (e) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(bookings)); }
    catch (e) { toast('Could not save data on this device.'); }
  }
  function newId() { return 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function fillSelect(el, items) { el.innerHTML = items.map(function (i) { return '<option>' + i + '</option>'; }).join(''); }
  function prettyDate(s) {
    var p = s.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  function todayISO() {
    var d = new Date(); var m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  /* ---------- navigation ---------- */
  var TITLES = { list: 'Bookings', form: 'Booking details', summary: 'Summary' };
  function go(name) {
    ['list', 'form', 'summary'].forEach(function (n) {
      $('screen-' + n).classList.toggle('active', n === name);
    });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.go === name); });
    $('title').textContent = (name === 'form' && $('f-id').value) ? 'Edit booking' : (name === 'form' ? 'New booking' : TITLES[name]);
    if (name === 'list') renderList();
    if (name === 'summary') renderSummary();
    window.scrollTo(0, 0);
  }

  /* ---------- list screen ---------- */
  function renderList() {
    var items = L.filterBookings(bookings, $('filter').value, $('search').value);
    $('empty').hidden = bookings.length > 0;
    $('list').innerHTML = items.map(function (b) {
      return '<li class="card" data-id="' + b.id + '">' +
        '<div class="top"><h3>' + esc(b.client) + '</h3><span class="badge b-' + b.status + '">' + b.status + '</span></div>' +
        '<p>' + esc(b.service) + ' &middot; ' + prettyDate(b.date) + '</p>' +
        '<p>' + esc(b.phone) + '</p>' +
        '<p class="charge">' + L.formatUGX(b.charge) + '</p>' +
        '<div class="actions"><button class="btn small" data-act="edit">Edit</button>' +
        '<button class="btn small danger" data-act="del">Delete</button></div></li>';
    }).join('');
    if (bookings.length && !items.length) $('list').innerHTML = '<li class="empty">No bookings match your search.</li>';
  }

  $('list').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]'); if (!btn) return;
    var id = btn.closest('.card').dataset.id;
    if (btn.dataset.act === 'edit') openForm(id);
    else if (btn.dataset.act === 'del') {
      var b = bookings.filter(function (x) { return x.id === id; })[0];
      if (b && confirm('Delete the booking for ' + b.client + '? This cannot be undone.')) {
        bookings = bookings.filter(function (x) { return x.id !== id; });
        save(); renderList(); toast('Booking deleted');
      }
    }
  });
  $('search').addEventListener('input', renderList);
  $('filter').addEventListener('change', renderList);

  /* ---------- form screen ---------- */
  var FIELDS = ['client', 'phone', 'service', 'date', 'charge', 'status'];
  function clearErrors() {
    FIELDS.forEach(function (f) { $('e-' + f).textContent = ''; $('f-' + f).classList.remove('invalid'); });
  }
  function openForm(id) {
    clearErrors();
    var b = id ? bookings.filter(function (x) { return x.id === id; })[0] : null;
    $('f-id').value = b ? b.id : '';
    $('f-client').value = b ? b.client : '';
    $('f-phone').value = b ? b.phone : '';
    $('f-service').value = b ? b.service : L.SERVICES[0];
    $('f-date').value = b ? b.date : todayISO();
    $('f-charge').value = b ? b.charge : '';
    $('f-status').value = b ? b.status : 'Pending';
    $('save').textContent = b ? 'Update booking' : 'Save booking';
    go('form');
  }
  $('form').addEventListener('submit', function (e) {
    e.preventDefault(); clearErrors();
    var data = {
      client: $('f-client').value.trim(), phone: $('f-phone').value.trim(), service: $('f-service').value,
      date: $('f-date').value, charge: $('f-charge').value.trim(), status: $('f-status').value
    };
    var errs = L.validateBooking(data);
    var keys = Object.keys(errs);
    if (keys.length) {
      keys.forEach(function (k) { $('e-' + k).textContent = errs[k]; $('f-' + k).classList.add('invalid'); });
      $('f-' + keys[0]).focus();
      toast('Please fix the highlighted fields');
      return;
    }
    data.charge = Number(data.charge);
    var id = $('f-id').value;
    if (id) {
      bookings = bookings.map(function (b) { return b.id === id ? Object.assign({}, b, data) : b; });
      toast('Booking updated');
    } else {
      data.id = newId(); bookings.push(data); toast('Booking saved');
    }
    save(); $('f-id').value = ''; go('list');
  });
  $('cancel').addEventListener('click', function () { $('f-id').value = ''; go('list'); });

  /* ---------- summary screen ---------- */
  function renderSummary() {
    var s = L.calcSummary(bookings);
    $('s-expected').textContent = L.formatUGX(s.expected);
    $('s-earned').textContent = L.formatUGX(s.earned);
    $('s-total').textContent = s.total;
    $('s-pending').textContent = s.Pending;
    $('s-confirmed').textContent = s.Confirmed;
    $('s-completed').textContent = s.Completed;
    $('s-cancelled').textContent = s.Cancelled;
  }
  $('sample').addEventListener('click', function () {
    var d = function (n) { var x = new Date(); x.setDate(x.getDate() + n);
      return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
    var rows = [
      ['Grace Nakato', '0772000001', 'House cleaning', d(1), 50000, 'Confirmed'],
      ['Brian Okello', '0701000002', 'Office cleaning', d(2), 120000, 'Pending'],
      ['Sarah Namutebi', '0752000003', 'Deep cleaning', d(-3), 200000, 'Completed'],
      ['David Mugisha', '0782000004', 'Carpet cleaning', d(4), 80000, 'Pending'],
      ['Esther Auma', '0772000005', 'Window cleaning', d(-1), 60000, 'Cancelled'],
      ['Peter Ssali', '+256700000006', 'Laundry and ironing', d(-5), 35000, 'Completed']
    ];
    rows.forEach(function (r) {
      bookings.push({ id: newId(), client: r[0], phone: r[1], service: r[2], date: r[3], charge: r[4], status: r[5] });
    });
    save(); renderSummary(); toast('Sample data added');
  });
  $('clear').addEventListener('click', function () {
    if (bookings.length && confirm('Delete ALL bookings? This cannot be undone.')) {
      bookings = []; save(); renderSummary(); toast('All data cleared');
    }
  });

  /* ---------- start ---------- */
  fillSelect($('f-service'), L.SERVICES);
  fillSelect($('f-status'), L.STATUSES);
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      if (t.dataset.go === 'form') { openForm(null); } else { $('f-id').value = ''; go(t.dataset.go); }
    });
  });
  renderList();

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
  }
})();
