import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Smartphone,
  Mail,
  Calendar,
  ShieldCheck,
  Save,
  Edit3,
  X,
  Bell,
  MapPin,
  Lock,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

export interface SettingsPanelProps {
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const { toast } = useToast();
  const [profile, setProfile] = useState<{
    phone: string;
    email: string;
    joined: string;
    verified: boolean;
    location: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editPhone, setEditPhone] = useState('');
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: prof } = await supabase
          .from('profiles')
          .select('phone_number,created_at,location_lat,location_lng')
          .eq('id', data.user.id)
          .maybeSingle();
        setProfile({
          phone: prof?.phone_number || data.user.phone || '—',
          email: data.user.email || '—',
          joined: prof?.created_at
            ? new Date(prof.created_at).toLocaleDateString()
            : new Date().toLocaleDateString(),
          verified: true,
          location: 'Narsipatnam, Anakapalli District',
        });
        setEditPhone(prof?.phone_number || data.user.phone || '');
      });
    });
  }, []);

  const handleSave = async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from('profiles').update({ phone_number: editPhone }).eq('id', userData.user.id);
      setProfile((prev) => (prev ? { ...prev, phone: editPhone } : prev));
      setIsEditing(false);
      toast({ title: 'Profile saved', description: 'Your phone number has been updated.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-5">
      {/* Profile Header */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/10">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">My Profile</p>
          <p className="text-xs text-muted-foreground">Manage your account details</p>
          {profile?.verified && (
            <span className="inline-flex items-center gap-1 text-[10px] text-success mt-1">
              <ShieldCheck className="w-3 h-3" /> Verified User
            </span>
          )}
        </div>
      </div>

      {/* Profile Info Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-3">
            <Smartphone className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Phone Number</p>
              {isEditing ? (
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-8 mt-1 w-48"
                  placeholder="Enter phone number"
                />
              ) : (
                <p className="text-sm font-medium">{profile?.phone || '—'}</p>
              )}
            </div>
          </div>
          {isEditing ? (
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
              <Button size="sm" onClick={handleSave} className="h-8 px-2">
                <Save className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
              <Edit3 className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{profile?.email || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Location</p>
              <p className="text-sm font-medium">{profile?.location || '—'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/50">
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Member Since</p>
              <p className="text-sm font-medium">{profile?.joined || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 space-y-3">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          Preferences
        </h4>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Push Notifications</span>
          </div>
          <button
            onClick={() => {
              setNotifEnabled((v) => !v);
              toast({ title: notifEnabled ? 'Notifications disabled' : 'Notifications enabled' });
            }}
            className={`relative w-10 h-5 rounded-full transition-colors ${notifEnabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${notifEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>

      {/* Security / Help Links */}
      <div className="space-y-2">
        <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <Lock className="w-4 h-4 text-warning" />
            <span className="text-sm font-medium">Security</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
        <button className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors text-left">
          <div className="flex items-center gap-3">
            <HelpCircle className="w-4 h-4 text-info" />
            <span className="text-sm font-medium">Help & Support</span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <Button variant="outline" onClick={onClose} className="w-full">
        Close Settings
      </Button>
    </div>
  );
};

export default SettingsPanel;
