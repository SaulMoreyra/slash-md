import { z } from "zod";

export const listPagesSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
});

export const readPageSchema = z.object({
  path: z.string().min(1).max(1024),
});

export const searchPagesSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(100).optional(),
});

export const gitContextSchema = z.object({});

export const reviewLoteSchema = z.object({});