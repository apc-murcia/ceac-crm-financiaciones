#!/usr/bin/env python3
"""
import_csv.py — Importador CSV de Salesforce para CEAC CRM Financiaciones

Uso:
    DATABASE_URL=postgresql://... python scripts/import_csv.py fichero.csv

El CSV de entrada debe ser una exportación de Salesforce con los campos:
    Id, Name, Phone, MobilePhone, Email, Importe_Total__c,
    ReservaAmount__c, FinancedAmount__c, DocMgrStatus__c,
    (opcional) Sede__c, Curso__c, Modalidad__c
"""

import csv
import os
import sys
import re
from datetime import datetime

try:
    import psycopg2
    from psycopg2.extras import execute_values
except ImportError:
    print("ERROR: psycopg2 no instalado. Ejecuta: pip install psycopg2-binary")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Mapeo de campos SF → BD
# ---------------------------------------------------------------------------

SF_FIELD_MAP = {
    "Id": "sf_opportunity_id",
    "Name": "_nombre_completo",        # se procesa para separar nombre/apellidos
    "Phone": "telefono",
    "MobilePhone": "telefono2",
    "Email": "email",
    "Importe_Total__c": "importe_total_recibos",
    "ReservaAmount__c": "importe_reserva",
    "FinancedAmount__c": "importe_financiado",
    "DocMgrStatus__c": "doc_mgr_status",
    "Sede__c": "sede",
    "Curso__c": "curso",
    "Modalidad__c": "modalidad",
}

ESTADOS_VALIDOS = {
    "pendiente_llamar", "no_localizable", "llamado", "interesado",
    "en_proceso_sabadell", "convertido", "rechazado_banco", "rechazado_alumno",
}


def parse_decimal(value: str):
    """Convierte string de importe a float, tolerando comas y símbolos."""
    if not value or value.strip() == "":
        return None
    cleaned = re.sub(r"[€$\s]", "", value).replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None


def split_nombre_apellidos(nombre_completo: str):
    """
    Intenta separar nombre y apellidos.
    Asume formato 'Apellido1 Apellido2, Nombre' (estilo SF) o 'Nombre Apellido1 Apellido2'.
    """
    if not nombre_completo:
        return "", ""

    # Formato SF: "Apellidos, Nombre"
    if "," in nombre_completo:
        partes = nombre_completo.split(",", 1)
        apellidos = partes[0].strip()
        nombre = partes[1].strip() if len(partes) > 1 else ""
        return nombre, apellidos

    # Formato libre: primera palabra = nombre, resto = apellidos
    partes = nombre_completo.strip().split()
    if len(partes) == 1:
        return partes[0], ""
    nombre = partes[0]
    apellidos = " ".join(partes[1:])
    return nombre, apellidos


def map_row(row: dict) -> dict | None:
    """
    Convierte una fila del CSV al formato de la tabla alumnos.
    Devuelve None si la fila es inválida (sin sf_opportunity_id).
    """
    mapped = {}

    for sf_field, db_field in SF_FIELD_MAP.items():
        raw = row.get(sf_field, "").strip()
        if db_field == "_nombre_completo":
            nombre, apellidos = split_nombre_apellidos(raw)
            mapped["nombre"] = nombre or raw
            mapped["apellidos"] = apellidos
        elif db_field in ("importe_total_recibos", "importe_reserva", "importe_financiado"):
            mapped[db_field] = parse_decimal(raw)
        else:
            mapped[db_field] = raw if raw else None

    # Validación mínima
    if not mapped.get("sf_opportunity_id"):
        return None

    # Nombre fallback
    if not mapped.get("nombre"):
        mapped["nombre"] = mapped.get("sf_opportunity_id", "Sin nombre")

    # Estado inicial
    mapped["estado"] = "pendiente_llamar"

    return mapped


def upsert_alumno(cursor, alumno: dict) -> str:
    """
    Inserta o actualiza un alumno por sf_opportunity_id.
    Devuelve 'inserted' o 'updated'.
    """
    cols_update = [
        "nombre", "apellidos", "email", "telefono", "telefono2",
        "sede", "curso", "modalidad",
        "importe_total_recibos", "importe_reserva", "importe_financiado",
        "doc_mgr_status",
    ]

    update_set = ", ".join(f"{c} = EXCLUDED.{c}" for c in cols_update)

    sql = f"""
        INSERT INTO alumnos (
            sf_opportunity_id, nombre, apellidos, email,
            telefono, telefono2, sede, curso, modalidad,
            importe_total_recibos, importe_reserva, importe_financiado,
            doc_mgr_status, estado
        ) VALUES (
            %(sf_opportunity_id)s, %(nombre)s, %(apellidos)s, %(email)s,
            %(telefono)s, %(telefono2)s, %(sede)s, %(curso)s, %(modalidad)s,
            %(importe_total_recibos)s, %(importe_reserva)s, %(importe_financiado)s,
            %(doc_mgr_status)s, %(estado)s
        )
        ON CONFLICT (sf_opportunity_id) DO UPDATE SET
            {update_set},
            updated_at = NOW()
        RETURNING (xmax = 0) AS inserted
    """

    cursor.execute(sql, alumno)
    row = cursor.fetchone()
    return "inserted" if row[0] else "updated"


def main():
    if len(sys.argv) < 2:
        print("Uso: python scripts/import_csv.py <fichero.csv>")
        sys.exit(1)

    csv_path = sys.argv[1]
    if not os.path.isfile(csv_path):
        print(f"ERROR: Fichero no encontrado: {csv_path}")
        sys.exit(1)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: Variable de entorno DATABASE_URL no definida.")
        sys.exit(1)

    print(f"[{datetime.now():%H:%M:%S}] Iniciando importación: {csv_path}")

    stats = {"total": 0, "inserted": 0, "updated": 0, "errors": 0}

    try:
        conn = psycopg2.connect(database_url)
        conn.autocommit = False
        cursor = conn.cursor()
    except Exception as e:
        print(f"ERROR: No se pudo conectar a la base de datos: {e}")
        sys.exit(1)

    try:
        with open(csv_path, newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            headers = reader.fieldnames or []
            print(f"Columnas detectadas: {', '.join(headers)}")

            for i, row in enumerate(reader, start=1):
                stats["total"] += 1
                try:
                    alumno = map_row(row)
                    if alumno is None:
                        print(f"  Fila {i}: IGNORADA (sin sf_opportunity_id)")
                        stats["errors"] += 1
                        continue

                    result = upsert_alumno(cursor, alumno)
                    stats[result] += 1

                    if i % 100 == 0:
                        conn.commit()
                        print(f"  Procesadas {i} filas...")

                except Exception as e:
                    print(f"  Fila {i}: ERROR — {e} | Datos: {dict(list(row.items())[:3])}")
                    stats["errors"] += 1
                    conn.rollback()

        conn.commit()

    except Exception as e:
        conn.rollback()
        print(f"ERROR fatal durante importación: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()

    print()
    print("=" * 50)
    print(f"RESUMEN — {datetime.now():%Y-%m-%d %H:%M:%S}")
    print(f"  Total filas procesadas : {stats['total']}")
    print(f"  Insertadas (nuevas)    : {stats['inserted']}")
    print(f"  Actualizadas           : {stats['updated']}")
    print(f"  Errores / ignoradas    : {stats['errors']}")
    print("=" * 50)


if __name__ == "__main__":
    main()
