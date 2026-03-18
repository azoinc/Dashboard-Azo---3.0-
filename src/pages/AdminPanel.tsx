import React, { useState, useEffect } from 'react';
import { db, firebaseConfig } from '../services/firebase';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, updateDoc } from 'firebase/firestore';
import { UserRole } from '../types';
import { UserPlus, Users, KeyRound } from 'lucide-react';

const secondaryApp = initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = getAuth(secondaryApp);

export default function AdminPanel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('FUNCIONARIO_RJ');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [usersList, setUsersList] = useState<any[]>([]);

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const users: any[] = [];
      querySnapshot.forEach((doc) => {
        users.push({ id: doc.id, ...doc.data() });
      });
      setUsersList(users);
    } catch (error) {
      console.error("Error fetching users", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
      const newUser = userCredential.user;
      
      await setDoc(doc(db, 'users', newUser.uid), {
        email: newUser.email,
        role: role,
        createdAt: new Date().toISOString()
      });
      
      setMessage('Usuário criado com sucesso!');
      setEmail('');
      setPassword('');
      fetchUsers();
      
      await secondaryAuth.signOut();
    } catch (error: any) {
      setMessage(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
      setResetMessage('Perfil atualizado com sucesso!');
      fetchUsers();
    } catch (error: any) {
      setResetMessage(`Erro ao atualizar perfil: ${error.message}`);
    }
  };

  const handleResetUserPassword = async (userEmail: string) => {
    setResetMessage('');
    try {
      await sendPasswordResetEmail(secondaryAuth, userEmail);
      setResetMessage(`E-mail de redefinição enviado para ${userEmail}`);
    } catch (error: any) {
      setResetMessage(`Erro ao enviar redefinição: ${error.message}`);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Painel Administrativo</h2>
        <p className="text-slate-500 mt-1">Gerencie os usuários do sistema</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <UserPlus className="text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">Criar Novo Usuário</h3>
          </div>
          
          {message && (
            <div className={`p-3 rounded-lg text-sm mb-6 ${message.includes('Erro') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {message}
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Perfil de Acesso</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
              >
                <option value="DIRETORIA">Diretoria</option>
                <option value="ADMINISTRATIVO">Administrativo</option>
                <option value="FUNCIONARIO_RJ">Funcionário RJ</option>
                <option value="FUNCIONARIO_CAMPINAS">Funcionário Campinas</option>
                <option value="COMERCIAL_RJ">Comercial RJ</option>
                <option value="COMERCIAL_CAMPINAS">Comercial Campinas</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar Usuário'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center space-x-2 mb-6">
            <Users className="text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-800">Usuários Cadastrados</h3>
          </div>

          {resetMessage && (
            <div className={`p-3 rounded-lg text-sm mb-6 ${resetMessage.includes('Erro') ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {resetMessage}
            </div>
          )}

          <div className="overflow-y-auto max-h-[400px]">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr className="text-slate-500">
                  <th className="px-4 py-2 font-medium">E-mail</th>
                  <th className="px-4 py-2 font-medium">Perfil</th>
                  <th className="px-4 py-2 font-medium text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.filter(u => u.role !== 'MASTER').map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{u.email}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium border-none focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                      >
                        <option value="DIRETORIA">Diretoria</option>
                        <option value="ADMINISTRATIVO">Administrativo</option>
                        <option value="FUNCIONARIO_RJ">Funcionário RJ</option>
                        <option value="FUNCIONARIO_CAMPINAS">Funcionário Campinas</option>
                        <option value="COMERCIAL_RJ">Comercial RJ</option>
                        <option value="COMERCIAL_CAMPINAS">Comercial Campinas</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleResetUserPassword(u.email)}
                        title="Enviar e-mail de redefinição de senha"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <KeyRound size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {usersList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-slate-500">
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
