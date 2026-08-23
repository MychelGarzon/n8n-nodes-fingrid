import { buildRequestParams } from "../GenericFunctions";
import type { IExecuteFunctions } from "n8n-workflow";

/**
 * Minimal fake of IExecuteFunctions, just enough to satisfy
 * buildRequestParams' use of getNodeParameter and getNode.
 */
function mockContext(params: Record<string, unknown>): IExecuteFunctions {
  return {
    getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) =>
      params[name] ?? fallback,
    getNode: () => ({ name: "Fingrid" }),
  } as unknown as IExecuteFunctions;
}

describe("buildRequestParams", () => {
  describe("dataset resource", () => {
    it("builds the correct endpoint for Get", () => {
      const ctx = mockContext({ datasetId: "74" });
      const result = buildRequestParams.call(ctx, "dataset", "get", 0);
      expect(result.endpoint).toBe("/datasets/74");
      expect(result.qs).toEqual({});
    });

    it("builds the correct endpoint and qs for Search with search text", () => {
      const ctx = mockContext({
        search: "wind",
        orderBy: "id",
        additionalOptions: { pageSize: 100 },
      });
      const result = buildRequestParams.call(ctx, "dataset", "search", 0);
      expect(result.endpoint).toBe("/datasets");
      expect(result.qs).toEqual({
        search: "wind",
        orderBy: "id",
        pageSize: 100,
      });
    });

    it("builds the correct endpoint for Get Data with time range", () => {
      const ctx = mockContext({
        datasetId: "74",
        startTime: "2026-08-01T00:00:00Z",
        endTime: "2026-08-02T00:00:00Z",
        additionalOptions: {},
      });
      const result = buildRequestParams.call(ctx, "dataset", "getData", 0);
      expect(result.endpoint).toBe("/datasets/74/data");
      expect(result.qs.startTime).toBe("2026-08-01T00:00:00Z");
      expect(result.qs.endTime).toBe("2026-08-02T00:00:00Z");
    });

    it("throws for an unknown dataset operation", () => {
      const ctx = mockContext({});
      expect(() => buildRequestParams.call(ctx, "dataset", "bogus", 0)).toThrow(
        /Unknown dataset operation/,
      );
    });
  });

  describe("data resource", () => {
    it("splits and trims comma-separated dataset IDs for Get Multiple", () => {
      const ctx = mockContext({
        datasets: "74, 75,  192",
        startTime: "2026-08-01T00:00:00Z",
        endTime: "2026-08-02T00:00:00Z",
        additionalOptions: {},
      });
      const result = buildRequestParams.call(ctx, "data", "getMultiple", 0);
      expect(result.endpoint).toBe("/data");
      expect(result.qs.datasets).toBe("74,75,192");
    });
  });

  describe("system resource", () => {
    it("builds the correct endpoint for Get Health Status", () => {
      const ctx = mockContext({});
      const result = buildRequestParams.call(
        ctx,
        "system",
        "getHealthStatus",
        0,
      );
      expect(result.endpoint).toBe("/health");
    });

    it("throws for an unknown resource entirely", () => {
      const ctx = mockContext({});
      expect(() => buildRequestParams.call(ctx, "bogus", "get", 0)).toThrow(
        /Unknown resource/,
      );
    });
  });
});
