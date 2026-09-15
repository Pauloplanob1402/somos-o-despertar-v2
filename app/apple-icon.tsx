import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1C1A18",
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 92,
            fontWeight: 700,
            color: "#DCAE6C",
          }}
        >
          D
        </span>
      </div>
    ),
    { ...size }
  );
}
