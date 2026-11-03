import React, { useState } from 'react';
import { Factory, ShieldAlert } from 'lucide-react';
import { USUARIOS_DEMO, useDemoSession } from '../context/demoSession';
import { Button } from '../components/common/Button';

export const LoginPage: React.FC = () => {
  const { iniciarSesion } = useDemoSession();
  const [idUsuario, setIdUsuario] = useState(USUARIOS_DEMO[0].id);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
            <Factory className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-bold">SCRAPControl</h1>
            <p className="text-sm text-slate-400">Acceso de demostración</p>
          </div>
        </div>

        <div className="mb-5 rounded-lg border border-amber-700/70 bg-amber-950/40 p-3 text-xs text-amber-200">
          <div className="flex gap-2 font-semibold">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            Este acceso no autentica ni protege datos.
          </div>
          <p className="mt-1 pl-6">
            Los roles son solo una maqueta de interfaz. No uses este modo como control de acceso.
          </p>
        </div>

        <label htmlFor="demo-user" className="mb-2 block text-sm font-medium text-slate-200">
          Usuario de prueba
        </label>
        <select
          id="demo-user"
          value={idUsuario}
          onChange={(event) => setIdUsuario(event.target.value)}
          className="mb-5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white"
        >
          {USUARIOS_DEMO.map((usuario) => (
            <option key={usuario.id} value={usuario.id}>
              {usuario.nombre} · {usuario.rol}
            </option>
          ))}
        </select>

        <Button className="w-full justify-center" variant="primary" onClick={() => iniciarSesion(idUsuario)}>
          Entrar a la demostración
        </Button>
      </section>
    </main>
  );
};
