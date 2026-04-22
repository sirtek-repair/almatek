// AlmaTek Google Apps Script Backend
// Deploy as Web App: Execute as Me, Anyone can access
// Paste the deployment URL into the app under Settings > Script URL

var ss = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  var payload = {};
  try { payload = JSON.parse(e.parameter.payload || '{}'); } catch(err) {}
  var result = handleAction(payload);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function rowToObj(headers, row) {
  var obj = {};
  headers.forEach(function(h, i) {
    obj[h] = row[i] instanceof Date ? row[i].toISOString() : row[i];
  });
  return obj;
}

function handleAction(p) {
  switch (p.action) {

    // ── Auth / Users ──────────────────────────────────────────────────
    case 'login': {
      var sheet = getOrCreate('Users', ['name','pass','structure']);
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][1] === p.pass) return { ok: true, name: rows[i][0], structure: rows[i][2] || 'standard' };
      }
      return { ok: false };
    }
    case 'list': {
      var sheet = getOrCreate('Users', ['name','pass','structure']);
      var rows = sheet.getDataRange().getValues();
      var users = [];
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0]) users.push({ name: rows[i][0], structure: rows[i][2] || 'standard' });
      }
      return { ok: true, users: users };
    }
    case 'add': {
      var sheet = getOrCreate('Users', ['name','pass','structure']);
      sheet.appendRow([p.name, p.pass, p.structure || 'standard']);
      return { ok: true };
    }
    case 'delete': {
      var sheet = getOrCreate('Users', ['name','pass','structure']);
      var rows = sheet.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] === p.name) { sheet.deleteRow(i + 1); break; }
      }
      return { ok: true };
    }
    case 'resetPass': {
      var sheet = getOrCreate('Users', ['name','pass','structure']);
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === p.name) { sheet.getRange(i + 1, 2).setValue(p.newPass); break; }
      }
      return { ok: true };
    }

    // ── Leads ─────────────────────────────────────────────────────────
    case 'getLeads': {
      var sheet = ss.getSheetByName('Leads');
      if (!sheet) return { ok: true, leads: [] };
      var rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return { ok: true, leads: [] };
      var headers = rows[0];
      var leads = [];
      for (var i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        var lead = rowToObj(headers, rows[i]);
        try { lead.notes = JSON.parse(lead.notes || '[]'); } catch(e) { lead.notes = []; }
        leads.push(lead);
      }
      return { ok: true, leads: leads };
    }
    case 'createLead': {
      var sheet = getOrCreate('Leads', [
        'id','name','phone','email','device','issue','status','tier',
        'followUpAt','followUpNotes','quote','deposit','assignedTo',
        'createdBy','createdAt','updatedAt','notes'
      ]);
      var l = p.lead || {};
      sheet.appendRow([
        l.id, l.name, l.phone, l.email, l.device, l.issue, l.status, l.tier || 'standard',
        l.followUpAt, l.followUpNotes, l.quote || 0, l.deposit || 0,
        l.assignedTo, l.createdBy, l.createdAt, l.updatedAt,
        JSON.stringify(l.notes || [])
      ]);
      return { ok: true };
    }
    case 'updateLead': {
      var sheet = getOrCreate('Leads', ['id']);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var u = p.updates || {};
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === p.leadId) {
          Object.keys(u).forEach(function(key) {
            var col = headers.indexOf(key);
            if (col >= 0) {
              var val = key === 'notes' ? JSON.stringify(u[key]) : u[key];
              sheet.getRange(i + 1, col + 1).setValue(val !== undefined ? val : '');
            }
          });
          var updCol = headers.indexOf('updatedAt');
          if (updCol >= 0) sheet.getRange(i + 1, updCol + 1).setValue(new Date().toISOString());
          break;
        }
      }
      return { ok: true };
    }
    case 'deleteLead': {
      var sheet = getOrCreate('Leads', ['id']);
      var rows = sheet.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (rows[i][0] === p.leadId) { sheet.deleteRow(i + 1); break; }
      }
      return { ok: true };
    }

    // ── Tickets ───────────────────────────────────────────────────────
    case 'getTickets': {
      var sheet = ss.getSheetByName('Tickets');
      if (!sheet) return { ok: true, tickets: [] };
      var rows = sheet.getDataRange().getValues();
      if (rows.length <= 1) return { ok: true, tickets: [] };
      var headers = rows[0];
      var tickets = [];
      for (var i = 1; i < rows.length; i++) {
        if (!rows[i][0]) continue;
        var ticket = rowToObj(headers, rows[i]);
        try { ticket.items = JSON.parse(ticket.items || '[]'); } catch(e) { ticket.items = []; }
        try { ticket.notes = JSON.parse(ticket.notes || '[]'); } catch(e) { ticket.notes = []; }
        tickets.push(ticket);
      }
      return { ok: true, tickets: tickets };
    }
    case 'createTicket': {
      var sheet = getOrCreate('Tickets', [
        'id','name','phone','email','device','issue','flow','status',
        'tier','repairType','repairModel','quote','deposit','mobileFee','mobileFeeMiles',
        'supplier','orderRef','items','notes','createdBy','createdAt','updatedAt'
      ]);
      var t = p.ticket || {};
      sheet.appendRow([
        t.id, t.name||'', t.phone||'', t.email||'', t.device||'', t.issue||'',
        t.flow||'in_stock', t.status||'waiting_for_repair',
        t.tier||'standard', t.repairType||'', t.repairModel||'',
        t.quote||0, t.deposit||0, t.mobileFee||0, t.mobileFeeMiles||0,
        t.supplier||'', t.orderRef||'',
        JSON.stringify(t.items||[]), JSON.stringify(t.notes||[]),
        t.createdBy||'', t.createdAt||'', t.updatedAt||''
      ]);
      return { ok: true };
    }
    case 'updateTicket': {
      var sheet = ss.getSheetByName('Tickets');
      if (!sheet) return { ok: true };
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0];
      var u = p.updates || {};
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(p.ticketId)) {
          Object.keys(u).forEach(function(key) {
            var col = headers.indexOf(key);
            if (col >= 0) {
              var val = (key === 'items' || key === 'notes') ? JSON.stringify(u[key]) : u[key];
              sheet.getRange(i + 1, col + 1).setValue(val !== undefined ? val : '');
            }
          });
          var updCol = headers.indexOf('updatedAt');
          if (updCol >= 0) sheet.getRange(i + 1, updCol + 1).setValue(new Date().toISOString());
          break;
        }
      }
      return { ok: true };
    }
    case 'deleteTicket': {
      var sheet = ss.getSheetByName('Tickets');
      if (!sheet) return { ok: true };
      var rows = sheet.getDataRange().getValues();
      for (var i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][0]) === String(p.ticketId)) { sheet.deleteRow(i + 1); break; }
      }
      return { ok: true };
    }

    // ── Part Orders ───────────────────────────────────────────────────
    case 'logCartOrder': {
      var sheet = getOrCreate('Part Orders', [
        'date','placedBy','supplier','item','qty'
      ]);
      var date = p.placedAt ? new Date(p.placedAt).toLocaleString('en-US', { timeZone: 'America/New_York' }) : new Date().toLocaleString();
      (p.items || []).forEach(function(item) {
        sheet.appendRow([date, p.placedBy || '', p.supplier || '', item.name || '', item.qty || 1]);
      });
      return { ok: true };
    }

    default:
      return { error: 'unknown action: ' + p.action };
  }
}

// ── Helper: get sheet by name or create it with headers ───────────────
function getOrCreate(name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}
