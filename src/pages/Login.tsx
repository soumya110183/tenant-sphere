import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // const handleRoleLogin = async (role: 'superadmin' | 'tenant' | 'staff') => {
  //   setIsLoading(true);

  //   try {
  //     const demoCredentials = {
  //       superadmin: { email: 'admin@tenantsphere.com', password: 'admin123' },
  //       tenant: { email: 'tenant@example.com', password: 'tenant123' },
  //       staff: { email: 'staff@example.com', password: 'staff123' }
  //     };
      
  //     await login(demoCredentials[role].email, demoCredentials[role].password);
      
  //     toast({
  //       title: 'Login successful',
  //       description: `Welcome as ${role}`,
  //     });
      
  //     navigate('/dashboard');
  //   } catch (error) {
  //     toast({
  //       title: 'Login failed',
  //       description: error instanceof Error ? error.message : 'Invalid credentials',
  //       variant: 'destructive',
  //     });
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(email, password);
      
      toast({
        title: 'Login successful',
        description: 'Welcome back to TenantSphere',
      });
      
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Invalid credentials',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-2xl">TS</span>
          </div>
          <CardTitle className="text-3xl font-bold">TenantSphere</CardTitle>
          <CardDescription>
            
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign In
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground"></span>
              </div>
            </div>

            {/* <div className="grid grid-cols-3 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleRoleLogin('superadmin')}
                disabled={isLoading}
              >
                Admin
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleRoleLogin('tenant')}
                disabled={isLoading}
              >
                Tenant
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => handleRoleLogin('staff')}
                disabled={isLoading}
              >
                Staff
              </Button>
            </div> */}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
