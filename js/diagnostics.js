/**
 * Obsidian Flux - Interactive Diagnostics Terminal Module
 * Simulates CLI diagnostic routines (ICMP Ping, Traceroute, Portscan, NSLookup).
 */

window.DiagnosticsModule = (function () {
  let terminal = null;
  let isRunning = false;

  function init() {
    terminal = document.getElementById('terminal-output');
    const form = document.getElementById('diagnostic-form');
    if (form) {
      form.addEventListener('submit', handleFormSubmit);
    }
    const clearBtn = document.getElementById('clear-terminal-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearTerminal);
    }
  }

  function clearTerminal() {
    if (terminal) {
      terminal.innerHTML = `<div class="terminal-line"><span class="terminal-prompt">ObsidianFlux-OS v4.2#</span> Diagnostic Console Cleared.</div>`;
    }
  }

  function appendLine(text, type = 'normal') {
    if (!terminal) return;
    const div = document.createElement('div');
    div.className = 'terminal-line';
    
    if (type === 'prompt') {
      div.innerHTML = `<span class="terminal-prompt">ObsidianFlux-OS#</span> ${text}`;
    } else if (type === 'error') {
      div.innerHTML = `<span class="terminal-error">[ERROR] ${text}</span>`;
    } else if (type === 'warning') {
      div.innerHTML = `<span class="terminal-warning">[WARN] ${text}</span>`;
    } else if (type === 'info') {
      div.innerHTML = `<span class="terminal-info">${text}</span>`;
    } else {
      div.innerText = text;
    }

    terminal.appendChild(div);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    if (isRunning) return;

    const command = document.getElementById('diag-command').value;
    const target = document.getElementById('diag-target').value.trim();
    const count = parseInt(document.getElementById('diag-count').value) || 4;

    if (!target) {
      appendLine('Error: Target Host / IP cannot be blank.', 'error');
      return;
    }

    isRunning = true;
    const runBtn = document.getElementById('run-diag-btn');
    runBtn.disabled = true;
    runBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Executing...`;

    switch (command) {
      case 'ping':
        runPing(target, count, () => finishExecution(runBtn));
        break;
      case 'traceroute':
        runTraceroute(target, count, () => finishExecution(runBtn));
        break;
      case 'portscan':
        runPortscan(target, () => finishExecution(runBtn));
        break;
      case 'dnslookup':
        runDNSLookup(target, () => finishExecution(runBtn));
        break;
      default:
        finishExecution(runBtn);
    }
  }

  function finishExecution(btn) {
    isRunning = false;
    btn.disabled = false;
    btn.innerHTML = `<i class="bi bi-play-fill"></i> Execute Command`;
  }

  function runPing(target, count, callback) {
    appendLine(`ping -c ${count} ${target}`, 'prompt');
    appendLine(`PING ${target} 56(84) bytes of ICMP packet data.`);

    let current = 0;
    const interval = setInterval(() => {
      current++;
      const latency = (Math.random() * 12 + 6).toFixed(2);
      const ttl = 64 - Math.floor(Math.random() * 4);
      appendLine(`64 bytes from ${target}: icmp_seq=${current} ttl=${ttl} time=${latency} ms`);

      if (current >= count) {
        clearInterval(interval);
        appendLine(`--- ${target} ping statistics ---`);
        appendLine(`${count} packets transmitted, ${count} received, 0% packet loss, time ${(count * 502)}ms`);
        appendLine(`rtt min/avg/max/mdev = 6.12/${(Math.random() * 5 + 10).toFixed(2)}/18.42/2.14 ms`, 'info');
        callback();
      }
    }, 450);
  }

  function runTraceroute(target, maxHops, callback) {
    appendLine(`traceroute to ${target}, ${maxHops} hops max, 60 byte packets`, 'prompt');

    const hopsList = [
      '10.0.1.1 (core-router-east-01)',
      '192.168.100.254 (gw-provider-edge.net)',
      '72.14.233.88 (bgp-backbone-transit.com)',
      '108.170.248.1 (datacenter-interconnect.net)',
      target
    ];

    let step = 0;
    const interval = setInterval(() => {
      step++;
      const hopStr = hopsList[step - 1] || `${Math.floor(Math.random()*200 + 10)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.1`;
      const r1 = (Math.random() * 5 + step * 4).toFixed(3);
      const r2 = (Math.random() * 5 + step * 4).toFixed(3);
      const r3 = (Math.random() * 5 + step * 4).toFixed(3);

      appendLine(` ${step}  ${hopStr}  ${r1} ms  ${r2} ms  ${r3} ms`);

      if (step >= Math.min(maxHops, hopsList.length)) {
        clearInterval(interval);
        appendLine(`Trace complete. Route resolved with ${step} network hops.`, 'info');
        callback();
      }
    }, 550);
  }

  function runPortscan(target, callback) {
    appendLine(`nmap -sS -T4 -F ${target}`, 'prompt');
    appendLine(`Starting Nmap TCP Syn Stealth Scan against ${target}`);

    const ports = [
      { port: '22/tcp', state: 'open', service: 'ssh' },
      { port: '80/tcp', state: 'open', service: 'http' },
      { port: '443/tcp', state: 'open', service: 'https' },
      { port: '5432/tcp', state: 'open', service: 'postgresql' },
      { port: '8080/tcp', state: 'filtered', service: 'http-proxy' },
      { port: '9090/tcp', state: 'open', service: 'prometheus' }
    ];

    setTimeout(() => {
      appendLine('PORT     STATE    SERVICE');
      ports.forEach(p => {
        const stateColor = p.state === 'open' ? 'info' : 'warning';
        appendLine(`${p.port.padEnd(8)} ${p.state.padEnd(8)} ${p.service}`, stateColor);
      });
      appendLine(`Nmap done: 1 IP address (1 host up) scanned in 1.48 seconds.`, 'info');
      callback();
    }, 1200);
  }

  function runDNSLookup(target, callback) {
    appendLine(`nslookup ${target}`, 'prompt');
    appendLine('Server:         10.0.1.53 (dns-bind9-ns1)');
    appendLine('Address:        10.0.1.53#53');
    appendLine('');

    setTimeout(() => {
      appendLine(`Name:    ${target}`);
      appendLine(`Address: 10.0.1.10`);
      appendLine(`Aliases: internal-lb.obsidianflux.net`);
      appendLine(`Authoritative records found in 12ms.`, 'info');
      callback();
    }, 800);
  }

  return {
    init,
    clearTerminal,
    appendLine
  };
})();
