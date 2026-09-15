import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 260,
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
