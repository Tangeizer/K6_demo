import { check, group } from 'k6';
import http from 'k6/http';
import { Trend, Rate, Counter } from 'k6/metrics';

// Кастомные метрики для демонстрации
const restDuration = new Trend('rest_request_duration');
const restSuccessRate = new Rate('rest_success_rate');
const restRequests = new Counter('rest_total_requests');

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
    'rest_success_rate': ['rate>0.95'],
    'rest_request_duration': ['p(95)<1000'],
    'http_req_duration{name:GetUser}': ['p(95)<800'],
  },
};

// Вспомогательная функция для безопасного парсинга JSON
function safeJsonParse(response) {
  try {
    return JSON.parse(response.body);
  } catch (error) {
    console.log(`Failed to parse JSON: ${response.body.substring(0, 100)}...`);
    return null;
  }
}

export default function () {
  group('REST API Test Suite', function () {
    // Тест 1: Получение пользователя (надежный API)
    const userResponse = http.get('https://jsonplaceholder.typicode.com/users/1', {
      tags: { name: 'GetUser' }
    });
    
    const userData = safeJsonParse(userResponse);
    
    check(userResponse, {
      'user status is 200': (r) => r.status === 200,
      'user response is JSON': () => userData !== null,
      'user has name': () => userData && userData.name !== undefined,
      'user has email': () => userData && userData.email !== undefined,
    });

    // Тест 2: Получение постов
    const postsResponse = http.get('https://jsonplaceholder.typicode.com/posts?userId=1', {
      tags: { name: 'GetPosts' }
    });

    const postsData = safeJsonParse(postsResponse);

    check(postsResponse, {
      'posts status is 200': (r) => r.status === 200,
      'posts response is JSON': () => postsData !== null,
      'posts array not empty': () => postsData && postsData.length > 0,
    });

    // Тест 3: Получение комментариев
    const commentsResponse = http.get('https://jsonplaceholder.typicode.com/comments?postId=1', {
      tags: { name: 'GetComments' }
    });

    const commentsData = safeJsonParse(commentsResponse);

    check(commentsResponse, {
      'comments status is 200': (r) => r.status === 200,
      'comments response is JSON': () => commentsData !== null,
      'comments array not empty': () => commentsData && commentsData.length > 0,
    });

    // Обновляем кастомные метрики
    const totalDuration = userResponse.timings.duration + 
                         postsResponse.timings.duration + 
                         commentsResponse.timings.duration;
    
    restDuration.add(totalDuration);
    restSuccessRate.add(userResponse.status === 200 && 
                       postsResponse.status === 200 && 
                       commentsResponse.status === 200);
    restRequests.add(3);
  });
}