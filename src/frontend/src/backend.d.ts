import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Cell {
    value: Value;
    name: string;
}
export interface Clip {
    endSeconds: bigint;
    title: string;
    hashtags: Array<string>;
    caption: string;
    index: bigint;
    startSeconds: bigint;
}
export interface ClipPlan {
    id: PlanId;
    owner: Principal;
    sourceTitle: string;
    clips: Array<Clip>;
    name: string;
    createdAt: Timestamp;
    subtitlesEnabled: boolean;
    sourceUrl: string;
    language: string;
    durationSeconds: bigint;
    maxClipSeconds: bigint;
    channel: string;
    aspectRatio: AspectRatio;
}
export type Error_ = {
    __kind__: "FrontendOriginsNotConfigured";
    FrontendOriginsNotConfigured: null;
} | {
    __kind__: "MixedSsoSources";
    MixedSsoSources: {
        otherKeys: Array<string>;
        ssoKeys: Array<string>;
    };
} | {
    __kind__: "Stale";
    Stale: {
        ageNs: bigint;
    };
} | {
    __kind__: "MalformedCandid";
    MalformedCandid: null;
} | {
    __kind__: "AmbiguousAttribute";
    AmbiguousAttribute: {
        field: string;
        sources: Array<string>;
    };
} | {
    __kind__: "NoAttributes";
    NoAttributes: null;
} | {
    __kind__: "UnknownNonce";
    UnknownNonce: null;
} | {
    __kind__: "UntrustedSsoSource";
    UntrustedSsoSource: {
        domain: string;
    };
} | {
    __kind__: "MissingField";
    MissingField: string;
} | {
    __kind__: "FrontendOriginMismatch";
    FrontendOriginMismatch: {
        got: string;
        expected: Array<string>;
    };
};
export interface GenerateOptions {
    subtitlesEnabled: boolean;
    maxClipSeconds: bigint;
    aspectRatio: AspectRatio;
}
export interface GeneratePlanRequest {
    url: string;
    options: GenerateOptions;
}
export type GeneratePlanResult = {
    __kind__: "ok";
    ok: ClipPlan;
} | {
    __kind__: "err";
    err: PlanError;
};
export interface HttpHeader {
    value: string;
    name: string;
}
export interface HttpRequestResult {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type PlanError = {
    __kind__: "aiFailure";
    aiFailure: string;
} | {
    __kind__: "unreachable";
    unreachable: string;
} | {
    __kind__: "invalidUrl";
    invalidUrl: string;
} | {
    __kind__: "noCaptions";
    noCaptions: string;
};
export type PlanId = bigint;
export interface Result {
    hasMore: boolean;
    rows: Array<Array<Cell>>;
}
export type Result__1 = {
    __kind__: "ok";
    ok: null;
} | {
    __kind__: "err";
    err: Error_;
};
export type Timestamp = bigint;
export interface TransformationInput {
    context: Uint8Array;
    response: HttpRequestResult;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<HttpHeader>;
}
export type Value = {
    __kind__: "int";
    int: bigint;
} | {
    __kind__: "nat";
    nat: bigint;
} | {
    __kind__: "float";
    float: number;
} | {
    __kind__: "bool";
    bool: boolean;
} | {
    __kind__: "null";
    null: null;
} | {
    __kind__: "text";
    text: string;
};
export enum AspectRatio {
    square = "square",
    portrait = "portrait",
    landscape = "landscape"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deletePlan(id: PlanId): Promise<boolean>;
    execute(qJson: string): Promise<Result>;
    generatePlan(request: GeneratePlanRequest): Promise<GeneratePlanResult>;
    getApiDoc(): Promise<string>;
    getCallerUserRole(): Promise<UserRole>;
    getPlan(id: PlanId): Promise<ClipPlan | null>;
    isCallerAdmin(): Promise<boolean>;
    listPlans(): Promise<Array<ClipPlan>>;
    schema(): Promise<string>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
