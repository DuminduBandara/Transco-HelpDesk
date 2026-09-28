"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  Menu,
  MenuItem,
  Avatar,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Chip,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import SupportAgentIcon from "@mui/icons-material/SupportAgent";
import AddIcon from "@mui/icons-material/Add";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ConfirmationNumberOutlinedIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ManageAccountsOutlinedIcon from "@mui/icons-material/ManageAccountsOutlined";

import SessionTimeoutHandler from "@/components/SessionTimeoutHandler";
import GlobalSearchBar from "@/components/GlobalSearchBar";

const DRAWER_WIDTH = 260;
const DRAWER_MINI_WIDTH = 72;

export default function AppShell({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  if (status === "loading") {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  const role = session?.user?.role;
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitial = userName.trim().charAt(0).toUpperCase() || "U";

  const handleDrawerToggle = () => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setDesktopOpen((prev) => !prev);
    }
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const navItems = [
    {
      label: "Dashboard",
      href: "/dashboard",
      icon: <DashboardOutlinedIcon />,
      active: pathname === "/dashboard",
    },
    {
      label: "Tickets",
      href: "/tickets",
      icon: <ConfirmationNumberOutlinedIcon />,
      active: pathname.startsWith("/tickets") && pathname !== "/tickets/new",
    },
    {
      label: "New Ticket",
      href: "/tickets/new",
      icon: <AddCircleOutlineIcon />,
      active: pathname === "/tickets/new",
    },
  ];

  const adminNavItems =
    role === "admin"
      ? [
          {
            label: "User Management",
            href: "/admin/users",
            icon: <PeopleAltOutlinedIcon />,
            active: pathname.startsWith("/admin/users"),
          },
          {
            label: "Roles & Departments",
            href: "/admin/settings",
            icon: <ManageAccountsOutlinedIcon />,
            active: pathname.startsWith("/admin/settings"),
          },
        ]
      : [];

  const accountNavItems = [
    {
      label: "My Profile",
      href: "/profile",
      icon: <PersonOutlineIcon />,
      active: pathname === "/profile",
    },
  ];

  // Helper to render navigation items
  const renderNavGroup = (
    items: typeof navItems,
    title: string | null,
    isMini: boolean
  ) => (
    <List
      disablePadding
      subheader={
        title && !isMini ? (
          <ListSubheader
            disableSticky
            sx={{
              bgcolor: "transparent",
              fontSize: "0.68rem",
              fontWeight: 700,
              color: "text.secondary",
              letterSpacing: 0.8,
              textTransform: "uppercase",
              px: 1.5,
              mb: 0.5,
            }}
          >
            {title}
          </ListSubheader>
        ) : undefined
      }
    >
      {items.map((item) => {
        const itemButton = (
          <ListItemButton
            component={Link}
            href={item.href}
            onClick={() => isMobile && setMobileOpen(false)}
            selected={item.active}
            sx={{
              borderRadius: 2,
              py: 1,
              px: isMini ? 0 : 1.5,
              minHeight: 44,
              justifyContent: isMini ? "center" : "flex-start",
              width: isMini ? 48 : "100%",
              mx: isMini ? "auto" : 0,
              mb: 0.5,
              "&.Mui-selected": {
                bgcolor: "rgba(21, 101, 192, 0.1)",
                color: "primary.main",
                fontWeight: 600,
                "& .MuiListItemIcon-root": {
                  color: "primary.main",
                },
                "&:hover": {
                  bgcolor: "rgba(21, 101, 192, 0.16)",
                },
              },
              "&:hover": {
                bgcolor: "action.hover",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: isMini ? 0 : 36,
                justifyContent: "center",
                color: item.active ? "primary.main" : "text.secondary",
              }}
            >
              {item.icon}
            </ListItemIcon>
            {!isMini && (
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: item.active ? 600 : 500,
                }}
              />
            )}
          </ListItemButton>
        );

        return (
          <ListItem key={item.href} disablePadding sx={{ display: "block" }}>
            {isMini ? (
              <Tooltip title={item.label} placement="right" arrow>
                {itemButton}
              </Tooltip>
            ) : (
              itemButton
            )}
          </ListItem>
        );
      })}
    </List>
  );

  // Drawer Content renderer (supporting both expanded and icon-only mini mode)
  const renderDrawerContent = (isMini: boolean) => (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#ffffff",
      }}
    >
      {/* Brand Header */}
      <Box
        sx={{
          height: 64,
          px: isMini ? 1.5 : 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: isMini ? "center" : "space-between",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {isMini ? (
          <Tooltip title="IT Help Desk - Dashboard" placement="right" arrow>
            <Box
              component={Link}
              href="/dashboard"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: "primary.main",
                color: "white",
                boxShadow: "0 2px 6px rgba(21, 101, 192, 0.3)",
                textDecoration: "none",
              }}
            >
              <SupportAgentIcon fontSize="medium" />
            </Box>
          </Tooltip>
        ) : (
          <>
            <Box
              component={Link}
              href="/dashboard"
              onClick={() => isMobile && setMobileOpen(false)}
              sx={{
                display: "flex",
                alignItems: "center",
                textDecoration: "none",
                color: "primary.main",
                gap: 1.25,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 1.5,
                  bgcolor: "primary.main",
                  color: "white",
                  boxShadow: "0 2px 6px rgba(21, 101, 192, 0.3)",
                }}
              >
                <SupportAgentIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography
                  variant="subtitle1"
                  fontWeight={700}
                  sx={{ lineHeight: 1.2, color: "text.primary", letterSpacing: -0.3 }}
                >
                  IT Help Desk
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
                  Service & Support Portal
                </Typography>
              </Box>
            </Box>

            {isMobile && (
              <IconButton size="small" onClick={() => setMobileOpen(false)}>
                <ChevronLeftIcon />
              </IconButton>
            )}
          </>
        )}
      </Box>

      {/* Main Navigation List */}
      <Box sx={{ flexGrow: 1, py: 2, px: isMini ? 0.75 : 1.5, overflowY: "auto" }}>
        {renderNavGroup(navItems, "Main Menu", isMini)}

        {adminNavItems.length > 0 && (
          <>
            <Divider sx={{ my: isMini ? 1.5 : 2 }} />
            {renderNavGroup(adminNavItems, "Administration", isMini)}
          </>
        )}

        <Divider sx={{ my: isMini ? 1.5 : 2 }} />
        {renderNavGroup(accountNavItems, "Account", isMini)}
      </Box>

      {/* Drawer Bottom User Card / Actions */}
      <Box
        sx={{
          p: isMini ? 1.5 : 2,
          borderTop: "1px solid",
          borderColor: "divider",
          bgcolor: "grey.50",
          display: "flex",
          flexDirection: "column",
          alignItems: isMini ? "center" : "stretch",
          gap: 1.5,
        }}
      >
        {isMini ? (
          <>
            <Tooltip title={`${userName} (${role?.toUpperCase()})`} placement="right" arrow>
              <Avatar
                component={Link}
                href="/profile"
                sx={{
                  width: 38,
                  height: 38,
                  bgcolor: "primary.main",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  textDecoration: "none",
                }}
              >
                {userInitial}
              </Avatar>
            </Tooltip>

            <Tooltip title="Sign Out" placement="right" arrow>
              <IconButton
                size="small"
                onClick={() => signOut({ callbackUrl: "/login" })}
                sx={{
                  color: "error.main",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "white",
                  "&:hover": { bgcolor: "error.50", borderColor: "error.main" },
                }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: "primary.main",
                  color: "white",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                }}
              >
                {userInitial}
              </Avatar>
              <Box sx={{ overflow: "hidden", flex: 1 }}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  noWrap
                  sx={{ color: "text.primary" }}
                >
                  {userName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {userEmail}
                </Typography>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              size="small"
              color="inherit"
              startIcon={<LogoutIcon fontSize="small" />}
              onClick={() => signOut({ callbackUrl: "/login" })}
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                color: "text.secondary",
                borderColor: "divider",
                py: 0.6,
                "&:hover": {
                  borderColor: "error.main",
                  color: "error.main",
                  bgcolor: "error.50",
                },
              }}
            >
              Sign Out
            </Button>
          </>
        )}
      </Box>
    </Box>
  );

  const desktopDrawerWidth = desktopOpen ? DRAWER_WIDTH : DRAWER_MINI_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Top AppBar */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          borderBottom: "1px solid",
          borderColor: "rgba(255, 255, 255, 0.15)",
        }}
      >
        <Toolbar sx={{ px: { xs: 1.5, sm: 2.5 }, gap: 1.5 }}>
          {/* Drawer Hamburger Toggle Button */}
          <IconButton
            color="inherit"
            aria-label="toggle navigation drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 0.5 }}
          >
            <MenuIcon />
          </IconButton>

          {/* IT Help Desk Logo as Home Link */}
          <Box
            component={Link}
            href="/dashboard"
            sx={{
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
              mr: { xs: 1, sm: 2 },
              "&:hover": { opacity: 0.9 },
            }}
          >
            <SupportAgentIcon sx={{ mr: 1, fontSize: 28 }} />
            <Typography
              variant="h6"
              fontWeight={700}
              sx={{
                letterSpacing: -0.2,
                whiteSpace: "nowrap",
                display: { xs: "none", sm: "block" },
              }}
            >
              IT Help Desk
            </Typography>
          </Box>

          {/* Search Bar */}
          <Box
            sx={{
              flexGrow: 1,
              display: "flex",
              justifyContent: "center",
              maxWidth: 520,
              mx: "auto",
            }}
          >
            <GlobalSearchBar />
          </Box>

          {/* New Ticket Button */}
          <Button
            component={Link}
            href="/tickets/new"
            color="inherit"
            variant="outlined"
            startIcon={<AddIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.85rem",
              whiteSpace: "nowrap",
              borderColor: "rgba(255, 255, 255, 0.4)",
              bgcolor: "rgba(255, 255, 255, 0.1)",
              px: { xs: 1.5, sm: 2 },
              py: 0.6,
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.2)",
                borderColor: "white",
              },
            }}
          >
            <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
              New Ticket
            </Box>
            <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
              New
            </Box>
          </Button>

          {/* User Name as Dropdown Menu */}
          <Button
            onClick={handleUserMenuOpen}
            color="inherit"
            aria-controls={Boolean(userMenuAnchor) ? "user-appbar-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(userMenuAnchor) ? "true" : undefined}
            sx={{
              textTransform: "none",
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1,
              py: 0.5,
              borderRadius: 2,
              bgcolor: Boolean(userMenuAnchor) ? "rgba(255,255,255,0.18)" : "transparent",
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.15)",
              },
            }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                bgcolor: "rgba(255, 255, 255, 0.25)",
                color: "white",
                fontWeight: 700,
                fontSize: "0.85rem",
                border: "1px solid rgba(255,255,255,0.4)",
              }}
            >
              {userInitial}
            </Avatar>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{
                display: { xs: "none", md: "block" },
                maxWidth: 130,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {userName}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 18, opacity: 0.85 }} />
          </Button>

          {/* User Dropdown Menu */}
          <Menu
            id="user-appbar-menu"
            anchorEl={userMenuAnchor}
            open={Boolean(userMenuAnchor)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            PaperProps={{
              elevation: 4,
              sx: {
                minWidth: 220,
                mt: 1.2,
                borderRadius: 2,
                overflow: "visible",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                border: "1px solid",
                borderColor: "divider",
              },
            }}
          >
            {/* Header info in Menu */}
            <Box sx={{ px: 2, py: 1.5 }}>
              <Typography variant="subtitle2" fontWeight={600} noWrap>
                {userName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {userEmail}
              </Typography>
              {role && (
                <Chip
                  label={role.toUpperCase()}
                  size="small"
                  color={role === "admin" ? "primary" : role === "agent" ? "info" : "default"}
                  sx={{ mt: 0.8, fontSize: "0.68rem", height: 20, fontWeight: 600 }}
                />
              )}
            </Box>

            <Divider />

            {/* Profile Edit Option */}
            <MenuItem
              onClick={() => {
                handleUserMenuClose();
                router.push("/profile");
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <PersonOutlineIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Edit Profile"
                secondary="Personal info & password"
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
                secondaryTypographyProps={{ fontSize: "0.72rem" }}
              />
            </MenuItem>

            {/* Direct Tickets shortcut */}
            <MenuItem
              onClick={() => {
                handleUserMenuClose();
                router.push("/tickets");
              }}
              sx={{ py: 1 }}
            >
              <ListItemIcon>
                <ConfirmationNumberOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="My Tickets"
                primaryTypographyProps={{ fontSize: "0.875rem", fontWeight: 500 }}
              />
            </MenuItem>

            <Divider />

            {/* Logout Option */}
            <MenuItem
              onClick={() => signOut({ callbackUrl: "/login" })}
              sx={{
                py: 1,
                color: "error.main",
                "&:hover": { bgcolor: "error.50" },
              }}
            >
              <ListItemIcon>
                <LogoutIcon fontSize="small" sx={{ color: "error.main" }} />
              </ListItemIcon>
              <ListItemText
                primary="Logout"
                primaryTypographyProps={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "error.main",
                }}
              />
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Side Vertical Drawer */}
      <Box
        component="nav"
        sx={{
          width: { xs: 0, md: desktopDrawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
        aria-label="navigation mailbox folders"
      >
        {/* Mobile Temporary Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: DRAWER_WIDTH,
              borderRight: "1px solid",
              borderColor: "divider",
            },
          }}
        >
          {renderDrawerContent(false)}
        </Drawer>

        {/* Desktop Mini / Full Persistent Drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: desktopDrawerWidth,
              borderRight: "1px solid",
              borderColor: "divider",
              overflowX: "hidden",
              top: 0,
              height: "100vh",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
        >
          {renderDrawerContent(!desktopOpen)}
        </Drawer>
      </Box>

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: {
            xs: "100%",
            md: `calc(100% - ${desktopDrawerWidth}px)`,
          },
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          pt: 8, // Height of fixed AppBar
          transition: theme.transitions.create(["margin", "width"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, flexGrow: 1 }}>{children}</Box>
      </Box>

      {/* Session Inactivity Timeout Handler */}
      <SessionTimeoutHandler />
    </Box>
  );
}