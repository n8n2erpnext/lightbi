import { describe, it, expect } from 'vitest';
import { preflightLinkInput } from './input-intent';

describe('preflightLinkInput', () => {
  describe('question / not_link', () => {
    it('Normal question', () => {
      expect(preflightLinkInput("Analyze sales by branch")).toEqual({ status: "not_link" });
    });
    it('Garbage text', () => {
      expect(preflightLinkInput("acssssssssssssssssssssssssssssss")).toEqual({ status: "not_link" });
    });
  });

  describe('Google Sheets supported', () => {
    it('Valid with https', () => {
      expect(preflightLinkInput("https://docs.google.com/spreadsheets/d/abc123/edit")).toEqual({
        status: "supported",
        sourceType: "google_sheets",
        label: "Google Sheets",
        confidence: 1.0,
        normalizedUrl: "https://docs.google.com/spreadsheets/d/abc123/edit"
      });
    });
    it('Valid without protocol', () => {
      expect(preflightLinkInput("docs.google.com/spreadsheets/d/abc123/edit")).toEqual({
        status: "supported",
        sourceType: "google_sheets",
        label: "Google Sheets",
        confidence: 1.0,
        normalizedUrl: "https://docs.google.com/spreadsheets/d/abc123/edit"
      });
    });
  });

    it('Valid even if missing sheet ID with https', () => {
      expect(preflightLinkInput("https://docs.google.com/spreadsheets/")).toEqual({
        status: "supported",
        sourceType: "google_sheets",
        label: "Google Sheets",
        confidence: 1.0,
        normalizedUrl: "https://docs.google.com/spreadsheets/"
      });
    });
    it('Valid even if missing sheet ID without protocol', () => {
      expect(preflightLinkInput("docs.google.com/spreadsheets/")).toEqual({
        status: "supported",
        sourceType: "google_sheets",
        label: "Google Sheets",
        confidence: 1.0,
        normalizedUrl: "https://docs.google.com/spreadsheets/"
      });
    });
    it('Valid with google.com domain', () => {
      expect(preflightLinkInput("google.com/spreadsheets/d/abc123")).toEqual({
        status: "supported",
        sourceType: "google_sheets",
        label: "Google Sheets",
        confidence: 1.0,
        normalizedUrl: "https://google.com/spreadsheets/d/abc123"
      });
    });

  describe('Unsupported', () => {
    it('Random URL', () => {
      expect(preflightLinkInput("https://example.com/about")).toEqual({
        status: "unsupported",
        normalizedValue: "https://example.com/about"
      });
    });
    it('Google AI URL', () => {
      expect(preflightLinkInput("https://ai.google.com/spreadsheets/d/abc123")).toEqual({
        status: "unsupported",
        normalizedValue: "https://ai.google.com/spreadsheets/d/abc123"
      });
    });
  });

  describe('CSV / Excel', () => {
    it('CSV with https', () => {
      expect(preflightLinkInput("https://example.com/report.csv")).toEqual({
        status: "supported",
        sourceType: "csv_url",
        label: "CSV URL",
        confidence: 1.0,
        normalizedUrl: "https://example.com/report.csv"
      });
    });
    it('CSV without protocol', () => {
      expect(preflightLinkInput("example.com/report.csv")).toEqual({
        status: "supported",
        sourceType: "csv_url",
        label: "CSV URL",
        confidence: 1.0,
        normalizedUrl: "https://example.com/report.csv"
      });
    });
    it('report.csv (no domain) -> not_link (question)', () => {
      expect(preflightLinkInput("report.csv")).toEqual({ status: "not_link" });
    });
    it('Excel with query params', () => {
      expect(preflightLinkInput("https://example.com/report.xlsx?download=1")).toEqual({
        status: "supported",
        sourceType: "excel_url",
        label: "Excel URL",
        confidence: 1.0,
        normalizedUrl: "https://example.com/report.xlsx?download=1"
      });
    });
  });
});
