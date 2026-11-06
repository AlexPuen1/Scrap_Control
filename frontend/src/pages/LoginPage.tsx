import React, { useState } from 'react';
import { Factory, ShieldCheck } from 'lucide-react';
import { Button } from '../components/common/Button';

interface LoginPageProps {
  cargando: boolean;
  error: string | null;
  onIniciarSesion: (usuario: string, contrasena: string) => Promise<void>;
  onIniciarSesionWindows: () => Promise<void>;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  cargando,
  error,
  onIniciarSesion,
  onIniciarSesionWindows,
}) => {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  const ejecutar = async (accion: () => Promise<void>) => {
    setProcesando(true);
    setErrorAcceso(null);
    try {
      await accion();
    } catch (errorInicio: unknown) {
      setErrorAcceso(errorInicio instanceof Error ? errorInicio.message : 'No se pudo iniciar sesión.');
    } finally {
      setProcesando(false);
    }
  };

  const enviarFormulario = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void ejecutar(() => onIniciarSesion(usuario, contrasena));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Factory className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">SCRAPControl</h1>
            <p className="text-sm text-slate-400">Inicia sesión con tu cuenta autorizada</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={enviarFormulario}>
          <label className="block text-sm font-medium text-slate-300">
            Usuario
            <input
              autoComplete="username"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-500"
              disabled={cargando || procesando}
              onChange={(event) => setUsuario(event.target.value)}
              required
              value={usuario}
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Contraseña
            <input
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-slate-100 outline-none focus:border-blue-500"
              disabled={cargando || procesando}
              onChange={(event) => setContrasena(event.target.value)}
              required
              type="password"
              value={contrasena}
            />
          </label>
          {(errorAcceso || (error && error !== 'Inicia sesión para continuar.')) && (
            <p role="alert" className="rounded-lg border border-rose-800 bg-rose-950/50 p-3 text-sm text-rose-200">
              {errorAcceso || error}
            </p>
          )}
          <Button className="w-full justify-center" variant="primary" disabled={cargando || procesando}>
            {procesando ? 'Validando…' : 'Iniciar sesión'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          <span>o</span>
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <Button
          className="w-full justify-center"
          variant="secondary"
          disabled={cargando || procesando}
          onClick={() => void ejecutar(onIniciarSesionWindows)}
        >
          <ShieldCheck className="mr-2 h-4 w-4" />
          {procesando ? 'Validando…' : 'Continuar con Windows (Administrador)'}
        </Button>
      </section>
    </main>
  );
};
