"""
- File di conversione vegetazione v01 (14/09/2014)
- Migarzione a roelderickx/ogr2osm (13/10/2025)
- Aggiornamento mappatura CLC da file YAML (14/11/2025)
- Rimozione classi CLC 52300, 12210, 12220, 12230 (14/11/2025)
"""

# Source: https://wiki.openstreetmap.org/wiki/Veneto/Uso_del_suolo#File_delle_regole_in_formato_python

import ogr2osm
import os
import yaml


# Da non migrare: mari, strade, ...
clc_excluded = ["52300", "12210", "12220", "12230"]

# Load CLC -> tags mapping from YAML file (src/map_copsuolo.yaml)
clc_mapping = {}
yaml_path = os.path.join(os.path.dirname(__file__), "map_copsuolo.yaml")

try:
    with open(yaml_path, "r", encoding="utf-8") as _f:
        _data = yaml.safe_load(_f)
        if isinstance(_data, dict):
            for item in _data.get("map", []):
                code = (
                    str(item.get("clc_lv_all"))
                    if item.get("clc_lv_all") is not None
                    else None
                )
                if not code:
                    continue
                entry = {
                    "description": item.get("description"),
                    "tags": item.get("tags") or {},
                }
                clc_mapping[code] = entry
except Exception:
    # If YAML not present or parsing fails, keep mapping empty and proceed.
    clc_mapping = {}


class VenetoCopSuoloTranslation(ogr2osm.TranslationBase):

    def filter_tags(self, attrs):

        if not attrs:
            return
        tags = {}

        if "clc_lv_all" in attrs:
            code = attrs["clc_lv_all"]

            # First, try to get mapping from YAML file
            mapping = clc_mapping.get(code)
            if mapping:
                # Apply tags defined in mapping
                for k, v in mapping.get("tags", {}).items():
                    tags[k] = v
                return tags
            else:
                # No mapping found in YAML
                print(f"CLC mapping not found for code: {code}")

        # Fallback: return the tags with default attributes
        else:
            tags = dict(attrs) if attrs else {}

        return tags

    def filter_feature(self, ogrfeature, layer_fields, reproject):
        if ogrfeature is None:
            return None
        clc_lv_all = ogrfeature.GetFieldAsString("clc_lv_all")

        if clc_lv_all in clc_excluded:
            return None

        return ogrfeature
