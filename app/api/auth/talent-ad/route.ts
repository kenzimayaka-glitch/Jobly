import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { adminClient, ensureUser, getAuthUser } from "@/lib/server-auth";
const BUCKET="talent-ads",MAX=20*1024*1024;
