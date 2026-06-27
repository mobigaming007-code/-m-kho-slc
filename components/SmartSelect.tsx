"use client";

import { useMemo, useRef, useState } from "react";
import { normalizeName } from "@/lib/format";

type Option = { maKhuVuc: string; tenKhuVuc: string };

export function SmartSelect({
  value,
  placeholder,
  options,
  allowAll = false,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: Option[];
  allowAll?: boolean;
  onChange: (option: Option) => void;
}) {
  const [keyword, setKeyword] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  const list = useMemo(
    () => (allowAll ? [{ maKhuVuc: "", tenKhuVuc: "Tất cả khu vực" }, ...options] : options),
    [allowAll, options],
  );
  const filtered = list.filter((item) => normalizeName(item.tenKhuVuc).includes(normalizeName(keyword)));

  return (
    <div
      ref={wrapper}
      className="smart-select"
      onBlur={(event) => {
        if (!wrapper.current?.contains(event.relatedTarget as Node)) setOpen(false);
      }}
    >
      <input
        value={keyword}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setKeyword(event.target.value);
          setOpen(true);
        }}
      />
      <div className={`smart-dropdown ${open ? "show" : ""}`}>
        {filtered.length ? (
          filtered.map((item) => (
            <button
              type="button"
              className="smart-option"
              key={`${item.maKhuVuc}-${item.tenKhuVuc}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(item);
                setKeyword(item.maKhuVuc ? shortName(item.tenKhuVuc) : "");
                setOpen(false);
              }}
            >
              <span className="smart-option-title">{shortName(item.tenKhuVuc)}</span>
              <span className="smart-option-sub">{item.tenKhuVuc}</span>
            </button>
          ))
        ) : (
          <div className="smart-empty">Không tìm thấy khu vực</div>
        )}
      </div>
    </div>
  );
}

function shortName(name: string) {
  return name.length <= 55 ? name : `${name.slice(0, 55)}...`;
}
