export type RequestUser = {
  id: string;
  phoneNumber?: string | null;
  status?: string | null;
  typeUser?: string | null;
  email?: string;
  role?: string;
  firstName?: string | null;
  lastName?: string | null;
  isActive?: boolean;
  createdAt: Date;
  userType: "admin" | "user";
};

export type GatewayRouteRule = {
  methods: string[];
  pattern: RegExp;
};