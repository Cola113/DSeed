import { ImageResponse } from 'next/og';

export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
          color: '#fff',
          fontSize: 44,
          borderRadius: 12,
        }}
      >
        <div style={{ transform: 'translateY(2px)' }}>🥤</div>
      </div>
    ),
    { ...size }
  );
}
