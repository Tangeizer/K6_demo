import { check, group } from 'k6';
import ws from 'k6/ws';
import { Trend, Rate, Counter } from 'k6/metrics';

// Кастомные метрики для демонстрации
const wsDuration = new Trend('websocket_session_duration');
const wsSuccessRate = new Rate('websocket_success_rate');
const wsMessages = new Counter('websocket_total_messages');

export const options = {
  scenarios: {
    constant_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10s',
      startTime: '0s',
    },
  },
  thresholds: {
    'websocket_success_rate': ['rate>0.85'],
    'websocket_session_duration': ['p(95)<2500'],
  },
};

export default function () {
  group('WebSocket Test Suite', function () {
    const startTime = Date.now();
    let success = false;

    return new Promise((resolve) => {
      // Используем стабильный WebSocket сервер
      const wsUrl = 'wss://echo.websocket.org'; // Более надежный сервер
      
      console.log(`VU ${__VU} connecting to WebSocket...`);

      try {
        // Правильное использование WebSocket API в k6
        ws.connect(wsUrl, null, function (socket) {
          // Проверяем, что socket объект получен
          if (!socket) {
            console.error(`VU ${__VU} failed to get socket object`);
            const sessionDuration = Date.now() - startTime;
            wsDuration.add(sessionDuration);
            wsSuccessRate.add(false);
            resolve();
            return;
          }

          // Проверка соединения
          check(socket, {
            'WebSocket connection established': () => socket !== null,
          });

          socket.on('open', function open() {
            console.log(`VU ${__VU} connected`);
            
            // Отправляем тестовое сообщение
            const testMessage = JSON.stringify({
              type: 'test',
              vu: __VU,
              iteration: __ITER,
              timestamp: Date.now()
            });

            socket.send(testMessage);
            wsMessages.add(1);
          });

          socket.on('message', function message(data) {
            console.log(`VU ${__VU} received: ${data}`);
            
            // Простая проверка эхо-ответа
            check(data, {
              'received response': (d) => d.length > 0,
            });

            success = true;
            socket.close();
          });

          socket.on('close', function close() {
            console.log(`VU ${__VU} disconnected`);
            const sessionDuration = Date.now() - startTime;
            wsDuration.add(sessionDuration);
            wsSuccessRate.add(success);
            resolve();
          });

          socket.on('error', function error(e) {
            console.error(`VU ${__VU} WebSocket error:`, String(e));
            const sessionDuration = Date.now() - startTime;
            wsDuration.add(sessionDuration);
            wsSuccessRate.add(false);
            resolve();
          });

          // Автоматическое закрытие через 5 секунд
          setTimeout(function () {
            if (socket.readyState === 1) { // OPEN
              console.log(`VU ${__VU} timeout, closing connection`);
              socket.close();
            } else {
              resolve();
            }
          }, 5000);

        });
      } catch (error) {
        console.error(`VU ${__VU} connection failed:`, error);
        const sessionDuration = Date.now() - startTime;
        wsDuration.add(sessionDuration);
        wsSuccessRate.add(false);
        resolve();
      }
    });
  });
}