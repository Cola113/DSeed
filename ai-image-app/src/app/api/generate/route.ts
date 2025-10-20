export const runtime = 'nodejs';
export const maxDuration = 60;
export const preferredRegion = 'hkg1';

import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

const ARK_URL = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';
const ALLOWED_SIZES = new Set(['1K', '2K', '4K']);

type Mode = 'text' | 'img' | 'imgs';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let mode: Mode = 'text';
    let prompt = '';
    let model = 'doubao-seedream-4-0-250828';
    let size = '2K';
    let watermark: boolean | string = false; // 默认改为 false
    let imageUrls: string[] = [];

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      mode = String(form.get('mode') || 'text') as Mode;
      prompt = String(form.get('prompt') || '');
      model = String(form.get('model') || model);
      size = String(form.get('size') || size);
      watermark = String(form.get('watermark') ?? 'false') === 'true';

      if (!ALLOWED_SIZES.has(size)) size = '2K';

      const urlsFromForm = form.getAll('imageUrls').map(String).filter(Boolean);
      imageUrls.push(...urlsFromForm);

      const files = form.getAll('files').filter((f): f is File => f instanceof File);
      if (files.length > 0) {
        try {
          for (const file of files) {
            const { url } = await put(`uploads/${Date.now()}-${file.name}`, file, { access: 'public' });
            imageUrls.push(url);
          }
        } catch {
          return NextResponse.json(
            { error: '文件上传未配置：请先在 Vercel 启用 Blob，或改用 imageUrls 外链进行本地调试。' },
            { status: 501 }
          );
        }
      }
    } else {
      const body = await req.json();
      mode = (body.mode || 'text') as Mode;
      prompt = body.prompt || '';
      model = body.model || model;
      size = body.size || size;
      watermark = body.watermark ?? false;

      if (!ALLOWED_SIZES.has(size)) size = '2K';

      imageUrls = Array.isArray(body.imageUrls)
        ? body.imageUrls
        : body.imageUrls
        ? [body.imageUrls]
        : [];
    }

    if (!prompt) {
      return NextResponse.json({ error: '缺少 prompt' }, { status: 400 });
    }

    const payload: any = {
      model,
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size,
      stream: false,
      watermark,
    };

    const imgs = imageUrls.filter(Boolean);
    if (mode !== 'text' && imgs.length === 0) {
      return NextResponse.json({ error: 'img/imgs 模式需要提供图片' }, { status: 400 });
    }
    if (imgs.length === 1) payload.image = imgs[0];
    if (imgs.length > 1) payload.image = imgs;

    const res = await fetch(ARK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.VOLC_API_KEY || ''}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: data?.error || data }, { status: res.status });
    }

    const urls = Array.isArray(data?.data)
      ? data.data.map((d: any) => d?.url).filter(Boolean)
      : [];

    return NextResponse.json({ images: urls, raw: data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
