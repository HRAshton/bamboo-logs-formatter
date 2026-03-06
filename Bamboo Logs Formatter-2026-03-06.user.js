// ==UserScript==
// @name         Bamboo Logs Formatter
// @version      2026-03-06
// @description  Formats Bamboo logs for better readability and analysis.
// @author       HRAshton
// @homepage     https://github.com/HRAshton/bamboo-logs-formatter
// @grant        GM_addStyle
// @match        http://your-bamboo-server.com/logs/*
// ==/UserScript==

(function () {
  'use strict';

  class LogProcessor {
    static logRegex = /^(\w+)\s+(\d{2}-\w{3}-\d{4} \d{2}:\d{2}:\d{2})\s+(.+)$/;

    static rerenderPage(logsContainer) {
      const text = logsContainer.querySelector('pre')?.innerText ?? '';

      const parsedLogs = text
        .split('\n')
        .map(LogProcessor._parseLogEntry)
        .filter(Boolean);

      LogProcessor._renderLogs(logsContainer, parsedLogs);
    }

    static _parseLogEntry(logLine) {
      const m = LogProcessor.logRegex.exec(logLine);
      return m && { level: m[1], timestamp: m[2], message: m[3], logLine };
    }

    static _renderLogs(container, logs) {
      container.innerHTML = '';
      logs.forEach((log, index) => {
        const cls = LogProcessor._getClass(log.message);

        const logElement = document.createElement('pre');
        logElement.className = `log-entry ${log.level.toLowerCase()} ${cls}`;
        logElement.textContent = log.logLine;
        logElement.id = `log-${index}`;
        container.appendChild(logElement);
      });
    }

    static _getClass(message) {
      if (message.startsWith('Starting task')) return 'task-start';
      if (message.startsWith('Finished task')) return 'task-end';
      if (message.startsWith('Skipping execution of task')) return 'task-skip';
      if (message.startsWith('Substituting variable')) return 'variable';

      return '';
    }
  }

  class Panel {
    static create(container) {
      const panel = Panel._createPanel(container);

      Panel._createFormatButton(panel, container);
      Panel._createErrorsOnlyButton(panel, container);
      Panel._createWrapLinesButton(panel, container);
      Panel._createTaskList(panel, container);
    }

    static _createPanel(container) {
      const panel = document.createElement('div');
      panel.classList.add('btf-panel');
      container.appendChild(panel);

      return panel;
    }

    static _createFormatButton(panel, container) {
      const button = document.createElement('button');
      button.textContent = 'Toggle Format';
      panel.appendChild(button);
      button.addEventListener('click', () => {
        container.classList.toggle('btf-format');
      });

      return button;
    }

    static _createErrorsOnlyButton(panel, container) {
      const button = document.createElement('button');
      button.textContent = 'Errors Only';
      panel.appendChild(button);
      button.addEventListener('click', () => {
        container.classList.toggle('btf-errors-only');
      });
    }

    static _createWrapLinesButton(panel, container) {
      const button = document.createElement('button');
      button.textContent = 'Toggle Wrap';
      panel.appendChild(button);
      button.addEventListener('click', () => {
        container.classList.toggle('btf-wrap-lines');
      });
    }

    static _createTaskList(panel, container) {
      const select = document.createElement('select');
      panel.appendChild(select);

      const firstEntry = container.querySelector('.log-entry:first-of-type');
      const lastEntry = container.querySelector('.log-entry:last-of-type');
      const tasks = Array.from(container.querySelectorAll(':is(.task-start, .task-skip)'))
        .map(el => Panel._getTask(el));

      const options = [
        { logId: '', option: 'Go To Task...' },
        { logId: firstEntry.id, option: '(scroll to top)' },
        ...tasks,
        { logId: lastEntry.id, option: '(scroll to bottom)' },
      ];
      options.forEach(taskPair => {
        const option = document.createElement('option');
        option.value = taskPair.logId;
        option.textContent = taskPair.option;
        select.appendChild(option);
      });

      select.addEventListener('change', () => {
        const selectedEntryId = select.value;
        if (!selectedEntryId) return;

        const entryElement = document.getElementById(selectedEntryId);
        if (!entryElement) return;

        entryElement.scrollIntoView({ block: 'center' });
        entryElement.classList.add('highlight');
        setTimeout(() => entryElement.classList.remove('highlight'), 700);

        select.value = ''; // reset to default option
      });
    }

    static _getTask(task) {
      const m = /(?:Starting task|Skipping execution of task) '(.+?)'/.exec(task.innerText);
      const taskName = m ? m[1] : task.innerText;
      return {
        logId: task.id,
        option: taskName,
      };
    }
  }

  const main = () => {
    LogProcessor.rerenderPage(document.body);
    Panel.create(document.body);
  }

  main();

  // Panel styles
  GM_addStyle(`
    .btf-panel {
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid grey;
      padding: 10px;
      z-index: 1000;

      display: flex;
      gap: 5px;
      flex-direction: column;
    }

    /* Show only first button when format is off */
    :not(.btf-format) > .btf-panel > *:not(:first-child) {
      display: none;
    }

    .highlight {
      animation: highlightAnim 0.7s ease-out;
    }
    @keyframes highlightAnim {
      from { background-color: orange; }
      to { background-color: transparent; }
    }
  `);

  // Formatting styles
  GM_addStyle(`
    /* Remove default margins from log entries */
    pre {
      margin: 0;
    }

    /* Log level colors */
    .btf-format .log-entry.simple {
      border-left: 5px solid grey;
    }

    .btf-format .log-entry.command {
      border-left: 5px solid lightgreen;
    }

    .btf-format .log-entry.build {
      border-left: 5px solid lightblue;
    }

    .btf-format .log-entry.error {
      border-left: 5px solid orangered;
    }

    /* Task-specific styles */
    .btf-format .variable,
    .btf-format :not(.variable) + .task-start,
    .btf-format :not(.variable) + .task-skip {
      margin-top: 0.5em;
      padding-top: 0.5em;
      border-top: 1px solid grey;
    }

    .btf-format .log-entry.task-end,
    .btf-format .task-skip {
      margin-bottom: 0.5em;
      padding-bottom: 0.5em;
      border-bottom: 1px solid grey;
    }

    .btf-format .variable {
      padding-bottom: 0.5em;
      border: 1px dashed grey;
    }

    /* Errors only mode */
    .btf-errors-only .log-entry:not(.error) {
      display: none;
    }

    /* Wrap long lines */
    .btf-wrap-lines .log-entry {
      white-space: pre-wrap;
    }
  `);
})();
