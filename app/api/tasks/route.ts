import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/lib/types';
import { updateTask, deleteTask } from '../../../lib/db/crud';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body?.id) {
      const response: ApiResponse = { ok: false, error: 'id is required' };
      return NextResponse.json(response, { status: 400 });
    }
    const updated = await updateTask(request, Number(body.id), body);
    const response: ApiResponse = { ok: true, data: updated };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to update task' };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      const response: ApiResponse = { ok: false, error: 'id is required' };
      return NextResponse.json(response, { status: 400 });
    }
    await deleteTask(request, Number(id));
    const response: ApiResponse = { ok: true };
    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse = { ok: false, error: 'Failed to delete task' };
    return NextResponse.json(response, { status: 500 });
  }
}


