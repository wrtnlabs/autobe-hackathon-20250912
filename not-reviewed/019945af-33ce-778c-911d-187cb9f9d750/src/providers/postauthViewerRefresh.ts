import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IFlexOfficeViewer } from "@ORGANIZATION/PROJECT-api/lib/structures/IFlexOfficeViewer";
import { ViewerPayload } from "../decorators/payload/ViewerPayload";

/**
 * Refresh JWT tokens operation for flexOffice viewer role maintaining session
 * continuity.
 *
 * This operation refreshes the JWT access and refresh tokens for a viewer user
 * based on a valid refresh token provided in the request body.
 *
 * It validates the refresh token, ensures the viewer is active (not deleted),
 * and then issues new tokens with the same payload structure as the login
 * process.
 *
 * @param props - Object containing viewer authorization payload and refresh
 *   token request body
 * @param props.viewer - Authenticated viewer payload (not used in this function
 *   as refresh uses token validation)
 * @param props.body - Request body containing the refresh token
 * @returns The refreshed authorization token object including new access and
 *   refresh tokens with expiration
 * @throws {Error} When the refresh token is invalid, expired, or the viewer
 *   user is not found or deleted
 */
export async function postauthViewerRefresh(props: {
  viewer: ViewerPayload;
  body: IFlexOfficeViewer.IRefresh;
}): Promise<IFlexOfficeViewer.IAuthorized> {
  const { body } = props;

  let decoded: unknown;

  try {
    decoded = jwt.verify(body.refresh_token, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    });
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token payload");
  }

  // Extract required claims safely
  const id = (decoded as Record<string, unknown>).id;
  const type = (decoded as Record<string, unknown>).type;

  if (typeof id !== "string" || typeof type !== "string") {
    throw new Error("Invalid token payload data types");
  }

  if (type !== "viewer") {
    throw new Error("Token payload type mismatch");
  }

  // Fetch viewer user ensuring not deleted
  const viewer = await MyGlobal.prisma.flex_office_viewers.findUniqueOrThrow({
    where: { id },
    select: { id: true, deleted_at: true },
  });

  if (viewer.deleted_at !== null) {
    throw new Error("User account is deleted");
  }

  // Generate tokens
  const accessPayload = {
    id: viewer.id,
    type: "viewer",
  };

  const accessToken = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });

  const refreshPayload = {
    id: viewer.id,
    type: "viewer",
    tokenType: "refresh",
  };

  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });

  // Calculate expiration timestamps as ISO strings
  const nowMs = Date.now();
  const accessExpiry = toISOStringSafe(new Date(nowMs + 3600 * 1000));
  const refreshExpiry = toISOStringSafe(new Date(nowMs + 7 * 24 * 3600 * 1000));

  return {
    id: viewer.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiry,
      refreshable_until: refreshExpiry,
    },
  };
}
