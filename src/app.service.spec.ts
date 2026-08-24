import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;

  beforeEach(() => {
    service = new AppService();
  });

  describe('ping', () => {
    it('returns status "ok"', () => {
      expect(service.ping()).toEqual({ status: 'ok' });
    });
  });
});
