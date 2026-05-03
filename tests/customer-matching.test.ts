import { describe, expect, it } from "vitest";
import { pickMatchedCustomerId } from "../packages/db/src/customer-matching";

describe("pickMatchedCustomerId", () => {
  it("matches by email only", () => {
    expect(pickMatchedCustomerId("cust_1", null)).toBe("cust_1");
  });

  it("matches by phone only", () => {
    expect(pickMatchedCustomerId(null, "cust_2")).toBe("cust_2");
  });

  it("matches when email and phone point to same customer", () => {
    expect(pickMatchedCustomerId("cust_3", "cust_3")).toBe("cust_3");
  });

  it("throws deterministically when email and phone point to different customers", () => {
    expect(() => pickMatchedCustomerId("cust_4", "cust_5")).toThrow("Customer email and phone match different records");
  });

  it("returns null when neither email nor phone match", () => {
    expect(pickMatchedCustomerId(null, null)).toBeNull();
  });
});
