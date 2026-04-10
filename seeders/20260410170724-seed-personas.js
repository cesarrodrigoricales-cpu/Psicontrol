'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('personas', [
      { apellidos: 'García López',  nombres: 'Carlos', tipodoc: 'DNI', nrodoc: '12345678', direccion: 'Av. Lima 123',     referencia: 'Frente al parque',  telefono: '987654321', genero: 'Masculino', created_at: new Date() },
      { apellidos: 'Torres Quispe', nombres: 'María',  tipodoc: 'DNI', nrodoc: '23456789', direccion: 'Jr. Cusco 456',    referencia: 'Cerca al mercado',  telefono: '987123456', genero: 'Femenino',  created_at: new Date() },
      { apellidos: 'Mamani Flores', nombres: 'Juan',   tipodoc: 'DNI', nrodoc: '34567890', direccion: 'Calle Arequipa 7', referencia: 'Al lado del banco', telefono: '912345678', genero: 'Masculino', created_at: new Date() },
      { apellidos: 'Díaz Huanca',   nombres: 'Lucía',  tipodoc: 'DNI', nrodoc: '45678901', direccion: 'Av. Grau 89',      referencia: 'Esquina con Jr. 2', telefono: '923456789', genero: 'Femenino',  created_at: new Date() },
      { apellidos: 'Ramos Ccallo',  nombres: 'Pedro',  tipodoc: 'DNI', nrodoc: '56789012', direccion: 'Pasaje Sol 12',    referencia: 'A 2 cuadras del cole', telefono: '934567890', genero: 'Masculino', created_at: new Date() },
    ]);
  },
  async down(queryInterface) {
    await queryInterface.bulkDelete('personas', null, {});
  }
};