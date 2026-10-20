
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../bd/bd';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type DatoMensual = { mes: string; vacantes: number; candidatos: number };

export default function Reclutador() {
  const [seccionActiva, setSeccionActiva] = useState('Inicio');
  const [conteos, setConteos] = useState({ vacantes: 0, candidatos: 0 });
  const [datosMensuales, setDatosMensuales] = useState<DatoMensual[]>([]);

  useEffect(() => {
    let activo = true;

    const cargarEstadisticas = async () => {
      const [v, c] = await Promise.all([
        supabase.from('vacantes').select('*'),
        supabase.from('candidatos').select('*'),
      ]);

      if (v.error || c.error) {
        console.error('Error:', v.error?.message, c.error?.message);
        return;
      }

      const vacantes = v.data ?? [];
      const candidatos = c.data ?? [];
      if (!activo) return;

      setConteos({ vacantes: vacantes.length, candidatos: candidatos.length });

      const hoy = new Date();
      const meses = Array.from({ length: 6 }, (_, i) => {
        const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 5 + i, 1);
        return {
          mes: MESES[fecha.getMonth()],
          clave: `${fecha.getFullYear()}-${fecha.getMonth()}`,
          vacantes: 0,
          candidatos: 0,
        };
      });

      const contar = (registros: any[], campo: 'vacantes' | 'candidatos') => {
        registros.forEach(registro => {
          const valor = registro.created_at ?? registro.fecha_creacion ?? registro.fecha_registro ?? registro.fecha;
          if (!valor) return;

          const fecha = new Date(valor);
          if (Number.isNaN(fecha.getTime())) return;

          const mes = meses.find(x => x.clave === `${fecha.getFullYear()}-${fecha.getMonth()}`);
          if (mes) mes[campo]++;
        });
      };

      contar(vacantes, 'vacantes');
      contar(candidatos, 'candidatos');

      if (activo) {
        setDatosMensuales(meses.map(({ mes, vacantes, candidatos }) => ({ mes, vacantes, candidatos })));
      }
    };

    cargarEstadisticas();

    const canal = supabase
      .channel('estadisticas-reclutador')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vacantes' }, cargarEstadisticas)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidatos' }, cargarEstadisticas)
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(canal);
    };
  }, []);

  const maximo = Math.max(1, ...datosMensuales.map(x => Math.max(x.vacantes, x.candidatos)));

  return (
    <SafeAreaView style={styles.pantalla}>
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.logo}>KADAF</Text>
        <Text style={styles.titulo}>Panel de reclutador</Text>

        <View style={styles.tarjetas}>
          {[
            { titulo: 'Vacantes', valor: conteos.vacantes },
            { titulo: 'Candidatos', valor: conteos.candidatos },
            { titulo: 'Postulaciones', valor: '—' },
          ].map(item => (
            <View key={item.titulo} style={styles.tarjeta}>
              <Text style={styles.etiqueta}>{item.titulo}</Text>
              <Text style={styles.numero}>{item.valor}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.subtitulo}>Accesos rápidos</Text>
        <View style={styles.accesos}>
          {['Vacantes', 'Candidatos'].map(nombre => (
            <Pressable key={nombre} style={styles.boton} onPress={() => setSeccionActiva(nombre)}>
              <Text style={styles.textoBoton}>Ver {nombre}</Text>
            </Pressable>
          ))}
        </View>

        {seccionActiva !== 'Inicio' && (
          <Text style={styles.mensaje}>Sección seleccionada: {seccionActiva}</Text>
        )}

        <View style={styles.panel}>
          <Text style={styles.subtitulo}>Estadísticas por mes</Text>
          <View style={styles.leyenda}>
            <Text style={{ color: '#2563EB' }}>■ Vacantes</Text>
            <Text style={{ color: '#10B981' }}>■ Candidatos</Text>
          </View>

          <View style={styles.grafica}>
            {datosMensuales.map(item => (
              <View key={item.mes} style={styles.grupoMes}>
                <View style={styles.barras}>
                  {[item.vacantes, item.candidatos].map((valor, i) => (
                    <View key={i} style={styles.columna}>
                      <Text style={styles.valor}>{valor}</Text>
                      <View style={[
                        styles.barra,
                        {
                          height: Math.max(4, (valor / maximo) * 110),
                          backgroundColor: i === 0 ? '#2563EB' : '#10B981',
                        },
                      ]} />
                    </View>
                  ))}
                </View>
                <Text style={styles.mes}>{item.mes}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Menú fijo al final de la pantalla */}
      <View style={styles.menu}>
        {['Inicio', 'Vacantes', 'Candidatos', 'Perfil'].map(nombre => (
          <Pressable key={nombre} onPress={() => setSeccionActiva(nombre)} style={styles.opcion}>
            <Text style={[styles.opcionMenu, seccionActiva === nombre && styles.activo]}>
              {nombre}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Pantalla principal
  pantalla: {
    flex: 1,
    backgroundColor: '#F4F6FA',
  },
  contenido: {
    padding: 20,
    paddingBottom: 25,
  },

  // Encabezado
  logo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  titulo: {
    fontSize: 21,
    fontWeight: 'bold',
    color: '#172033',
    marginVertical: 12,
  },

  // Tarjetas de estadísticas
  tarjetas: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  tarjeta: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFF',
    padding: 10,
    borderRadius: 12,
  },
  etiqueta: {
    color: '#667085',
    fontSize: 11,
  },
  numero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#172033',
    marginTop: 8,
  },

  // Accesos rápidos
  subtitulo: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#172033',
    marginBottom: 14,
  },
  accesos: {
    flexDirection: 'row',
    gap: 10,
  },
  boton: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  textoBoton: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  mensaje: {
    marginTop: 15,
    color: '#475467',
  },

  // Gráfica mensual
  panel: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  leyenda: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginBottom: 15,
  },
  grafica: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 150,
  },
  grupoMes: {
    flex: 1,
    alignItems: 'center',
  },
  barras: {
    height: 135,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  columna: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barra: {
    width: 12,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  valor: {
    fontSize: 10,
    color: '#475467',
    marginBottom: 3,
  },
  mes: {
    fontSize: 11,
    color: '#667085',
    marginTop: 8,
  },

  // Menú inferior
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  opcion: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  opcionMenu: {
    fontSize: 12,
    color: '#667085',
  },
  activo: {
    color: '#2563EB',
    fontWeight: 'bold',
  },
});