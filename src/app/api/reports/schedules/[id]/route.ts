import { NextRequest, NextResponse } from 'next/server';
import { ReportScheduler } from '@/lib/scheduler';

const scheduler = new ReportScheduler();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const scheduleId = (await context.params).id;
    const schedule = await scheduler.getSchedule(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const scheduleId = (await context.params).id;
    const body = await request.json();
    const schedule = await scheduler.updateSchedule(scheduleId, body);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const scheduleId = (await context.params).id;
    await scheduler.deleteSchedule(scheduleId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json(
      { error: 'Failed to delete schedule' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const scheduleId = (await context.params).id;
    const { status } = await request.json();
    const schedule = await scheduler.toggleScheduleStatus(scheduleId, status);

    return NextResponse.json(schedule);
  } catch (error) {
    console.error('Error updating schedule status:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule status' },
      { status: 500 }
    );
  }
} 