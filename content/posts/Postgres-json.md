---
title: Postgres处理JSON数据
date: 2026-07-12
excerpt: 在非结构化数据方面，Posgres提供了两种不同的数据类型，分别是json和jsonb。json是存储字符串的原始格式，而jsonb是以二进制存储。
tags: [写作, 思考]
---

在非结构化数据方面，Posgres提供了两种不同的数据类型，分别是json和jsonb。json是存储字符串的原始格式，而jsonb是以二进制存储。

## 创建jsonb字段

```postgresql
create table products(
	id bigserial primary key,
  	name varchar(100) NOT NULL,
  	attributes jsonb
);
```
插入数据
```postgresql
INSERT INTO products (name, attributes)
VALUES
(
    'MacBook Pro',
    '{
        "brand": "Apple",
        "price": 14999,
        "stock": 20,
        "tags": ["电脑", "办公", "开发"],
        "spec": {
            "cpu": "M5",
            "memory": 24,
            "color": "黑色"
        }
    }'
);
```

同样可以使用`json_build_object`

## json字段读取

```postgresql
select
	attributes -> 'brand'
from products;
```

```postgresql
select
	attributes ->> 'brand'
from products;
```

读取嵌套字段

```postgresql
select
	attributes ->> 'spec' ->> 'cpu';
```

## jsonb条件读取

```postgresql
select
	*
from products
where attributes ->> 'brand' = 'Apple';
```

```postgresql
select
	*
from products
where attributes ->> 'spec' -> 'memory'::integer > 16;
```

## json操作符查询

```postgresql
select
	*
from products
where attributes -> 'brand' @> '{"brand": "Apple"}';
```

```postgresql
select
	*
from attributes
where attributes -> 'spec' ? 'memory';
```

```postgresql
select
	*
from products
where attributes ?| array['brand', 'manufacturer'];
```

```postgresql
select
	*
from products
where attributes ?& array['brand', 'price', 'stock'];
```

## 更新jsonb

```postgresql
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{price}',
    '13999'
)
WHERE id = 1;
```

```postgresql
-- 更新嵌套JSON
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{spec,memory}',
    '32'
)
WHERE id = 1;
```

```postgresql
UPDATE products
SET attributes = jsonb_set(
    attributes,
    '{warranty}',
    to_jsonb('2年'::text)
)
WHERE id = 1;
```

## 删除json字段

删除某个字段

```postgresql
UPDATE products
SET attributes = attributes - 'stock'
WHERE id = 1;
```

删除几个字段

```postgresql
UPDATE products
SET attributes = attributes - array['stock', 'price']
WHERE id = 1;
```

## gin索引

```postgresql
CREATE INDEX idx_products_attributes
ON products
USING gin (attributes);
```

## 为指定字段添加索引

```postgresql
CREATE INDEX idx_products_brand
ON products ((attributes ->> 'brand'));
```

```postgresql
SELECT *
FROM products
WHERE attributes ->> 'brand' = 'Apple';
```

## json path

```
$       根对象
.       访问对象属性
[*]     访问数组全部元素
?()     过滤条件
@       当前元素
```

获取字段

```postgresql
SELECT jsonb_path_query(
    attributes,
    '$.spec.cpu'
)
FROM products;
```

获取数组

```postgresql
SELECT jsonb_path_query(
    attributes,
    '$.tags[*]'
)
FROM products;
```

条件查询

```postgresql
-- @?路径是否存在
SELECT 
	*
FROM products
WHERE attributes @? '$.price ? (@ > 10000)';
```

返回所有匹配函数

```postgresql
SELECT jsonb_path_query(
    attributes,
    '$.tags[*]'
)
FROM products;
```

