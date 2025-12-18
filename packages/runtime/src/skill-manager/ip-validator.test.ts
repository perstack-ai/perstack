import { describe, expect, it } from "vitest"
import { isPrivateOrLocalIP } from "./ip-validator.js"

describe("@perstack/runtime: isPrivateOrLocalIP", () => {
  describe("local hostnames", () => {
    it("returns true for localhost", () => {
      expect(isPrivateOrLocalIP("localhost")).toBe(true)
    })

    it("returns true for 127.0.0.1", () => {
      expect(isPrivateOrLocalIP("127.0.0.1")).toBe(true)
    })

    it("returns true for ::1 (IPv6 loopback)", () => {
      expect(isPrivateOrLocalIP("::1")).toBe(true)
    })

    it("returns true for 0.0.0.0", () => {
      expect(isPrivateOrLocalIP("0.0.0.0")).toBe(true)
    })
  })

  describe("IPv4 private ranges", () => {
    it("returns true for 10.x.x.x (class A private)", () => {
      expect(isPrivateOrLocalIP("10.0.0.1")).toBe(true)
      expect(isPrivateOrLocalIP("10.255.255.255")).toBe(true)
    })

    it("returns true for 172.16-31.x.x (class B private)", () => {
      expect(isPrivateOrLocalIP("172.16.0.1")).toBe(true)
      expect(isPrivateOrLocalIP("172.31.255.255")).toBe(true)
    })

    it("returns false for 172.15.x.x and 172.32.x.x", () => {
      expect(isPrivateOrLocalIP("172.15.0.1")).toBe(false)
      expect(isPrivateOrLocalIP("172.32.0.1")).toBe(false)
    })

    it("returns true for 192.168.x.x (class C private)", () => {
      expect(isPrivateOrLocalIP("192.168.0.1")).toBe(true)
      expect(isPrivateOrLocalIP("192.168.255.255")).toBe(true)
    })

    it("returns true for 169.254.x.x (link-local)", () => {
      expect(isPrivateOrLocalIP("169.254.0.1")).toBe(true)
      expect(isPrivateOrLocalIP("169.254.255.255")).toBe(true)
    })

    it("returns true for 127.x.x.x (loopback range)", () => {
      expect(isPrivateOrLocalIP("127.0.0.1")).toBe(true)
      expect(isPrivateOrLocalIP("127.255.255.255")).toBe(true)
    })
  })

  describe("IPv6 private ranges", () => {
    it("returns true for fe80:: (link-local)", () => {
      expect(isPrivateOrLocalIP("fe80::1")).toBe(true)
      expect(isPrivateOrLocalIP("fe80:0000:0000:0000:0000:0000:0000:0001")).toBe(true)
    })

    it("returns true for fc00::/7 (unique local)", () => {
      expect(isPrivateOrLocalIP("fc00::1")).toBe(true)
      expect(isPrivateOrLocalIP("fd00::1")).toBe(true)
    })
  })

  describe("IPv4-mapped IPv6 addresses", () => {
    it("returns true for ::ffff:127.0.0.1", () => {
      expect(isPrivateOrLocalIP("::ffff:127.0.0.1")).toBe(true)
    })

    it("returns true for ::ffff:192.168.1.1", () => {
      expect(isPrivateOrLocalIP("::ffff:192.168.1.1")).toBe(true)
    })

    it("returns false for ::ffff:8.8.8.8", () => {
      expect(isPrivateOrLocalIP("::ffff:8.8.8.8")).toBe(false)
    })
  })

  describe("public addresses", () => {
    it("returns false for public IPv4 addresses", () => {
      expect(isPrivateOrLocalIP("8.8.8.8")).toBe(false)
      expect(isPrivateOrLocalIP("1.1.1.1")).toBe(false)
      expect(isPrivateOrLocalIP("203.0.113.1")).toBe(false)
    })

    it("returns false for public hostnames", () => {
      expect(isPrivateOrLocalIP("example.com")).toBe(false)
      expect(isPrivateOrLocalIP("api.perstack.ai")).toBe(false)
    })
  })
})
