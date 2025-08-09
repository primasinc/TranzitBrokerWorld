// Test service to isolate compilation issues
export class TestService {
  static test() {
    return 'test';
  }
}

export const testService = {
  test: TestService.test
};
