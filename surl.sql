USE `shorturls`;
CREATE TABLE `shorturls` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `time_created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `slug` varchar(100) NOT NULL,
  `target` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `slug` (`slug`)
) DEFAULT CHARSET=utf8mb4;
