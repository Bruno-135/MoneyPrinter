import { describe, expect, it } from "vitest";
import { FINE_RATES, formatTime } from "./media";
import { parseYouTubeUrl } from "./youtube";

describe("parseYouTubeUrl", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    [`https://www.youtube.com/watch?v=${id}`, 0],
    [`https://youtube.com/watch?v=${id}&list=PL123&index=2`, 0],
    [`https://m.youtube.com/watch?v=${id}`, 0],
    [`https://music.youtube.com/watch?v=${id}`, 0],
    [`https://youtu.be/${id}`, 0],
    [`https://youtu.be/${id}?si=abc&t=42`, 42],
    [`https://www.youtube.com/watch?v=${id}&t=1m30s`, 90],
    [`https://www.youtube.com/shorts/${id}`, 0],
    [`https://www.youtube.com/embed/${id}?start=15`, 15],
    [`youtube.com/watch?v=${id}`, 0],
    [id, 0],
  ])("%s", (url, start) => {
    expect(parseYouTubeUrl(url)).toEqual({ id, start });
  });

  it.each(["", "olá", "https://vimeo.com/123", "https://www.youtube.com/watch?v=curto", "https://www.youtube.com/"])(
    "rejeita %s",
    (url) => {
      expect(parseYouTubeUrl(url)).toBeNull();
    },
  );
});

describe("formatTime", () => {
  it("formata minutos e décimos", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(75.46)).toBe("1:15");
    expect(formatTime(75.46, true)).toBe("1:15,4");
    expect(formatTime(NaN)).toBe("0:00");
  });
  it("velocidades finas vão de 25% a 150% em passos de 5%", () => {
    expect(FINE_RATES[0]).toBe(0.25);
    expect(FINE_RATES).toContain(1);
    expect(FINE_RATES).toContain(0.75);
    expect(FINE_RATES.at(-1)).toBe(1.5);
  });
});
