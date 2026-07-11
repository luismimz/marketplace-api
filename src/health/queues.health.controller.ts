import { Controller, Get } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Controller('api/_health/queues')
export class QueuesHealthController {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  @Get()
  async getQueuesHealth() {
    const [waiting, active, delayed, failed, completed, paused] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getDelayedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getPausedCount(),
    ]);
    return {
      queues: {
        email: { waiting, active, delayed, failed, completed, paused },
      },
      status: failed > 0 ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
