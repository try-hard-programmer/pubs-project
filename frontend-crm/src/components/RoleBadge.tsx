import { Badge } from '@/components/ui/badge';
import { OrganizationRole, OrganizationRolesService } from '@/lib/organizationRolesService';
import { Shield, ShieldCheck, ShieldAlert, User } from 'lucide-react';

interface RoleBadgeProps {
  role: OrganizationRole;
  isOwner?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const RoleBadge = ({ role, isOwner = false, showIcon = true, className = '' }: RoleBadgeProps) => {
  const getRoleIcon = () => {
    switch (role) {
      case 'super_admin':
        return <ShieldCheck className="w-3 h-3" />;
      case 'admin':
        return <ShieldAlert className="w-3 h-3" />;
      case 'moderator':
        return <Shield className="w-3 h-3" />;
      case 'user':
        return <User className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getRoleVariant = () => {
    switch (role) {
      case 'super_admin':
        return 'default'; // Purple in custom styling
      case 'admin':
        return 'default'; // Blue
      case 'moderator':
        return 'secondary'; // Green
      case 'user':
        return 'outline'; // Gray
      default:
        return 'outline';
    }
  };

  const getRoleClassName = () => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500 text-white hover:bg-purple-600';
      case 'admin':
        return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'moderator':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'user':
        return 'bg-gray-500 text-white hover:bg-gray-600';
      default:
        return '';
    }
  };

  return (
    <Badge className={`${getRoleClassName()} ${className} flex items-center gap-1`}>
      {showIcon && getRoleIcon()}
      <span>{OrganizationRolesService.getRoleDisplayName(role)}</span>
      {isOwner && <span className="text-xs">(Owner)</span>}
    </Badge>
  );
};